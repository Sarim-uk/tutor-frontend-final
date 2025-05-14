import axios from 'axios';

// Configure API base URL from environment or use default
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  // Add a timeout to prevent hanging requests
  timeout: 30000 // Increased timeout for better reliability
});

// Session management functions
export const saveUserSession = (userData, tokens) => {
  // Make sure the userData contains firstName and lastName
  const storedUserData = {
    ...userData,
    // Ensure we store firstName and lastName consistently
    firstName: userData.firstName || userData.first_name,
    lastName: userData.lastName || userData.last_name,
    // If neither are available, check if user has these fields
    ...(userData.user && {
      firstName: userData.user.firstName || userData.user.first_name,
      lastName: userData.user.lastName || userData.user.last_name
    })
  };
  
  localStorage.setItem('user', JSON.stringify(storedUserData));
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
  localStorage.setItem('session_start', Date.now().toString());
};

export const clearUserSession = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('session_start');
};

export const getSessionUser = () => {
  try {
    const userString = localStorage.getItem('user');
    if (!userString) return null;
    
    const userData = JSON.parse(userString);
    
    // Ensure the user object always has firstName and lastName properties
    return {
      ...userData,
      firstName: userData.firstName || userData.first_name || '',
      lastName: userData.lastName || userData.last_name || ''
    };
  } catch (error) {
    console.error('Error parsing user data from session:', error);
    return null;
  }
};

export const isSessionValid = () => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

// Add interceptor to handle token refresh
api.interceptors.request.use(
  async config => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Keep track of refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Check if error is a network error (server not running/unreachable)
    if (error.message === 'Network Error') {
      console.error('Network Error: Cannot connect to the server. Please ensure the backend is running.');
      return Promise.reject(new Error('Cannot connect to the server. Please check your connection or contact support.'));
    }
    
    // If error is 401 (Unauthorized) and the request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, add this request to queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // Try to refresh the token
        const refreshTokenValue = localStorage.getItem('refresh_token');
        if (!refreshTokenValue) {
          // Clear user session and redirect to login
          clearUserSession();
          window.location.href = '/login';
          return Promise.reject(new Error('No refresh token available'));
        }
        
        const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh_token: refreshTokenValue
        });
        
        // Update tokens in localStorage
        const newAccessToken = response.data.access_token || response.data.access;
        localStorage.setItem('access_token', newAccessToken);
        
        // If refresh token is rotated, update it too
        if (response.data.refresh_token || response.data.refresh) {
          localStorage.setItem('refresh_token', response.data.refresh_token || response.data.refresh);
        }
        
        // Process any queued requests
        processQueue(null, newAccessToken);
        
        // Retry the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear auth data and reject
        processQueue(refreshError, null);
        clearUserSession();
        
        // Redirect to login page
        window.location.href = '/login';
        
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }
    
    // If session expired (long time inactive)
    if (error.response?.status === 401) {
      clearUserSession();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Authentication services
export const loginUser = async (email, password) => {
  try {
    console.log(`Attempting direct login at: ${API_BASE_URL}/login/`);
    
    // Make a direct fetch request instead of using axios for login
    // This bypasses any issues with interceptors or HEAD requests
    const response = await fetch(`${API_BASE_URL}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      // Handle HTTP errors
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.access_token || !data.user) {
      throw new Error('Invalid server response structure');
    }

    // Save session data
    saveUserSession(data.user, {
      access_token: data.access_token,
      refresh_token: data.refresh_token
    });

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user
    };
  } catch (error) {
    console.error('Login error details:', error);
    
    // Handle different types of errors with more descriptive messages
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error('Cannot connect to the server. Please ensure the backend is running and accessible.');
    } else {
    throw error;
    }
  }
};

export const logoutUser = () => {
  clearUserSession();
  // Redirect to login or home page
  window.location.href = '/login';
};

export const refreshToken = async () => {
  try {
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }
    
    const response = await api.post('/token/refresh/', { refresh_token: refreshTokenValue });
    
    // Update tokens in localStorage
    const newAccessToken = response.data.access_token || response.data.access;
    localStorage.setItem('access_token', newAccessToken);
    
    // If refresh token is rotated, update it too
    if (response.data.refresh_token || response.data.refresh) {
      localStorage.setItem('refresh_token', response.data.refresh_token || response.data.refresh);
    }
    
    return {
      access_token: newAccessToken,
      refresh_token: response.data.refresh_token || response.data.refresh || refreshTokenValue
    };
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearUserSession();
    return null;
  }
};

// Session and student data services
export const fetchTutorSessions = async () => {
  try {
    const response = await api.get('/sessions/');
    
    if (!response.data || response.data.length === 0) {
      return [];
    }

    const sessionsWithDetails = await Promise.all(
      response.data.map(async (session) => {
        try {
          // Get student details
          const studentId = session.student_ids;
          if (!studentId) {
            console.error('Session missing student_ids:', session);
            return session;
          }
          
          const studentResponse = await api.get(`/users/${studentId}/`);
          const studentData = studentResponse.data;

          return {
            ...session,
            student_ids: studentId,
            student_uuid: studentData.id,
            student: {
              id: studentData.id,
              numeric_id: studentId,
              first_name: studentData.first_name,
              last_name: studentData.last_name,
              email: studentData.email,
              profile_picture_url: studentData.profile_picture_url,
              created_at: studentData.created_at
            }
          };
        } catch (error) {
          console.error(`Error fetching details for session ${session.id}:`, error);
          return {
            ...session,
            student: null
          };
        }
      })
    );

    return sessionsWithDetails.filter(session => session.student !== null);
  } catch (error) {
    console.error('Error in fetchTutorSessions:', error);
    throw error;
  }
};

export const fetchStudentProgress = async (studentId) => {
    if (!studentId) {
    console.warn('Skipping progress fetch for invalid student ID');
      return [];
    }
    
  try {
    const response = await api.get(`/progress/student/${studentId}/`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`No progress data found for student ${studentId}`);
      return [];
    }
    console.error(`Error fetching progress for student ${studentId}:`, error);
    return [];
  }
};

export const fetchTutorMeetingInfo = async (tutorId) => {
  try {
    const response = await api.get(`/meeting/tutor/${tutorId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tutor meeting info:', error);
    return null;
  }
};

export const fetchStudentNotes = async (studentId) => {
  try {
    const response = await api.get(`/notes/student/${studentId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching notes for student ${studentId}:`, error);
    return [];
  }
};

export const fetchSessionNotes = async (sessionId) => {
  try {
    const response = await api.get(`/api/sessions/${sessionId}/notes/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching notes for session ${sessionId}:`, error);
    return [];
  }
};

export const saveSessionNotes = async (sessionId, notes) => {
  try {
    const response = await api.post(`/notes/session/${sessionId}/`, { notes });
    return response.data;
  } catch (error) {
    console.error(`Error saving notes for session ${sessionId}:`, error);
    throw error;
  }
};

export const fetchSessionAssignments = async (sessionId) => {
  try {
    const response = await api.get(`/assignments/session/${sessionId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching assignments for session ${sessionId}:`, error);
    return [];
  }
};

export const createAssignment = async (assignmentData) => {
  // Handle FormData for file uploads
  const isFormData = assignmentData instanceof FormData;
  
  try {
    const response = await api.post('/api/assignments/', assignmentData, {
      headers: isFormData ? {
        'Content-Type': 'multipart/form-data'
      } : undefined
    });
    return response.data;
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

export const fetchDashboardData = async () => {
  try {
    const response = await api.get('/api/dashboard/');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};

export const fetchUserDetails = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user details for ${userId}:`, error);
    throw error;
  }
};

// Add these new API functions for dashboard data

export const fetchStudentSummary = async () => {
  try {
    const response = await api.get('/users/?role=student');
    console.log('Student API response:', response.data);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching student summary:', error);
    return [];
  }
};

export const fetchAssignmentStats = async () => {
  try {
    const response = await api.get('/api/assignments/stats/');
    return response.data || {
      total: 0,
      pending_review: 0,
      graded: 0,
      published: 0,
      draft: 0
    };
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    return {
      total: 0,
      pending_review: 0,
      graded: 0,
      published: 0,
      draft: 0
    };
  }
};

export const fetchUpcomingSessions = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Use the regular sessions endpoint, but filter on the frontend
    const sessions = await fetchTutorSessions();
    
    // Filter for upcoming sessions (today and future)
    return sessions.filter(session => {
      const sessionDate = new Date(session.scheduled_time);
      return sessionDate >= today;
    });
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    return [];
  }
};

export const fetchRecentActivity = async (limit = 5) => {
  try {
    // This is a placeholder - ideally your backend would have a dedicated endpoint
    // For now, we'll combine data from different sources
    
    const [sessions, assignments] = await Promise.all([
      fetchTutorSessions(),
      fetchAssignmentStats()
    ]);
    
    // Create activity items from sessions and assignments
    const sessionActivities = sessions.slice(0, limit).map(session => ({
      id: `session-${session.id}`,
      type: 'session',
      title: `Session with ${session.student?.first_name || 'Student'}`,
      time: session.scheduled_time,
      details: session
    }));
    
    const assignmentActivities = (assignments.slice(0, limit) || []).map(assignment => ({
      id: `assignment-${assignment.id || Math.random().toString()}`,
      type: 'assignment',
      title: assignment.title || 'Assignment',
      time: assignment.due_date || new Date().toISOString(),
      details: assignment
    }));
    
    // Combine and sort by time (most recent first)
    const combined = [...sessionActivities, ...assignmentActivities]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, limit);
    
    return combined;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
};

// Assignment Management API Functions

// Fetch all assignments created by the current teacher
export const fetchTeacherAssignments = async () => {
  try {
    const response = await api.get('/api/assignments/created/');
    return response.data;
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    return [];
  }
};

// Update an existing assignment
export const updateAssignment = async (assignmentId, assignmentData) => {
  // Handle FormData for file uploads
  const isFormData = assignmentData instanceof FormData;
  
  try {
    const response = await api.put(`/api/assignments/${assignmentId}/`, assignmentData, {
      headers: isFormData ? {
        'Content-Type': 'multipart/form-data'
      } : undefined
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating assignment ${assignmentId}:`, error);
    throw error;
  }
};

// Delete an assignment
export const deleteAssignment = async (assignmentId) => {
  try {
    await api.delete(`/api/assignments/${assignmentId}/`);
    return true;
  } catch (error) {
    console.error(`Error deleting assignment ${assignmentId}:`, error);
    throw error;
  }
};

// Get detailed information about a specific assignment
export const getAssignmentDetails = async (assignmentId) => {
  try {
    const response = await api.get(`/api/assignments/${assignmentId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching assignment details for ${assignmentId}:`, error);
    throw error;
  }
};

// Get all submissions for a specific assignment
export const getAssignmentSubmissions = async (assignmentId) => {
  try {
    const response = await api.get(`/api/assignments/${assignmentId}/submissions/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching submissions for assignment ${assignmentId}:`, error);
    return [];
  }
};

// Submit a grade for an assignment submission
export const gradeSubmission = async (submissionId, gradeData) => {
  try {
    const response = await api.post(`/api/submissions/${submissionId}/grade/`, gradeData);
    return response.data;
  } catch (error) {
    console.error(`Error grading submission ${submissionId}:`, error);
    throw error;
  }
};

// Update an existing grade
export const updateGrade = async (gradeId, gradeData) => {
  try {
    const response = await api.put(`/api/grades/${gradeId}/`, gradeData);
    return response.data;
  } catch (error) {
    console.error(`Error updating grade ${gradeId}:`, error);
    throw error;
  }
};

<<<<<<< HEAD
// Create student progress record
export const createStudentProgress = async (progressData) => {
  try {
    const response = await api.post('/progress/', progressData);
    return response.data;
  } catch (error) {
    console.error('Error creating student progress:', error);
    throw error;
  }
};

// Update student progress record
export const updateStudentProgress = async (progressId, progressData) => {
  try {
    const response = await api.put(`/progress/${progressId}/`, progressData);
    return response.data;
  } catch (error) {
    console.error(`Error updating progress ${progressId}:`, error);
    throw error;
  }
};

// Get detailed student performance data
export const getStudentPerformance = async (studentId) => {
  try {
    const response = await api.get(`/students/${studentId}/performance/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching student performance:', error);
    throw error;
  }
};

// Tutor Availability Management API functions
export const fetchTutorAvailability = async (tutorId) => {
  try {
    console.log(`Fetching tutor availability for ID: ${tutorId}`);
    
    // Add retry logic
    let retries = 3;
    let response;
    
    while (retries > 0) {
      try {
        response = await api.get(`/tutors/${tutorId}/availability/`);
        break; // Success, exit the retry loop
      } catch (err) {
        if (retries === 1 || (err.response && err.response.status !== 500 && err.response.status !== 502)) {
          // On last retry or if the error is not one we should retry on, throw the error
          throw err;
        }
        retries--;
        // Wait before retrying (with exponential backoff)
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching tutor availability:', error);
    throw error;
  }
};

export const addTutorAvailabilitySlot = async (tutorId, slotData) => {
  try {
    // Add retry logic
    let retries = 3;
    let response;
    
    while (retries > 0) {
      try {
        response = await api.post(`/tutors/${tutorId}/availability/`, slotData);
        break; // Success, exit the retry loop
      } catch (err) {
        if (retries === 1 || (err.response && err.response.status !== 500 && err.response.status !== 502)) {
          // On last retry or if the error is not one we should retry on, throw the error
          throw err;
        }
        retries--;
        // Wait before retrying (with exponential backoff)
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error adding tutor availability slot:', error);
    throw error;
  }
};

export const updateTutorAvailabilitySlot = async (tutorId, slotId, slotData) => {
  try {
    // For updating a slot, we use the direct availability endpoint
    const response = await api.put(`/availability/${slotId}/`, slotData);
    return response.data;
  } catch (error) {
    console.error('Error updating tutor availability slot:', error);
    throw error;
  }
};

export const deleteTutorAvailabilitySlot = async (tutorId, slotId) => {
  try {
    // For deleting a slot, we use the direct availability endpoint
    const response = await api.delete(`/availability/${slotId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting tutor availability slot:', error);
=======
// Get all assignments for the current user (student or teacher)
export const getAssignments = async () => {
  try {
    const response = await api.get('/api/assignments/');
    return response.data;
  } catch (error) {
    console.error('Error fetching assignments:', error);
>>>>>>> 4448c9df8a305a81a56d6e814b2687238f272e54
    throw error;
  }
};

export default api;