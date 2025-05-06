import axios from 'axios';
import { API_BASE_URL } from '../services/api';

/**
 * Check if the backend API is running and accessible
 * @returns {Promise<{success: boolean, message: string, status?: number}>}
 */
export const checkApiHealth = async () => {
  try {
    // Use GET instead of HEAD since the Django server is returning 405 for HEAD
    const response = await axios.get(API_BASE_URL, { 
      timeout: 5000,
      // Catch any redirects or errors
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Accept any status code that isn't a server error
      }
    });
    
    // Any response (even 404) means the server is running
    const isServerRunning = response.status !== undefined;
    
    // Then check if the login endpoint exists
    const loginEndpoint = `${API_BASE_URL}/login/`;
    const loginResponse = await axios.options(loginEndpoint, { 
      timeout: 5000,
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });
    
    const loginEndpointExists = loginResponse.status < 404;
    
    if (isServerRunning && loginEndpointExists) {
      return {
        success: true,
        message: 'Backend API is running and the login endpoint is accessible',
        status: loginResponse.status
      };
    } else if (isServerRunning) {
      return {
        success: false,
        message: `Server is running but login endpoint returned status: ${loginResponse.status}`,
        status: loginResponse.status
      };
    } else {
      return {
        success: false,
        message: 'Server seems to be running but not responding correctly',
        status: response.status
      };
    }
  } catch (error) {
    console.error('API health check failed:', error);
    
    if (error.code === 'ECONNREFUSED' || error.message === 'Network Error') {
      return {
        success: false,
        message: `Cannot connect to the backend server at ${API_BASE_URL}. Please ensure the server is running.`
      };
    }
    
    if (error.response) {
      return {
        success: false,
        message: `Backend server responded with an error: ${error.response.status} ${error.response.statusText}`,
        status: error.response.status
      };
    }
    
    return {
      success: false,
      message: `Failed to connect to backend API: ${error.message}`
    };
  }
};

/**
 * Check for CORS issues with the backend API
 * @returns {Promise<{hasCorsIssue: boolean, message: string}>}
 */
export const checkForCorsIssues = async () => {
  try {
    // Try a cross-origin request with credentials to check for CORS issues
    await axios.head(`${API_BASE_URL}/login/`, {
      timeout: 5000,
      withCredentials: true
    });
    
    return {
      hasCorsIssue: false,
      message: 'No CORS issues detected'
    };
  } catch (error) {
    if (error.message && error.message.includes('CORS')) {
      return {
        hasCorsIssue: true,
        message: `CORS issue detected: ${error.message}`
      };
    }
    
    // If it's not a CORS error, we won't report it as one
    return {
      hasCorsIssue: false,
      message: 'No CORS issues detected in this check'
    };
  }
};

/**
 * Check if the dashboard API endpoint is accessible
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export const checkDashboardEndpoint = async () => {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return {
        success: false,
        message: 'No access token available'
      };
    }
    
    const dashboardUrl = `${API_BASE_URL}/api/dashboard/`;
    console.log(`Checking dashboard endpoint at: ${dashboardUrl}`);
    
    const response = await axios.get(dashboardUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000,
      validateStatus: (status) => true // Accept any status to check what's happening
    });
    
    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        message: 'Dashboard API is accessible',
        data: response.data
      };
    } else if (response.status === 404) {
      return {
        success: false,
        message: `Dashboard API returned 404 Not Found. Check if the endpoint exists at ${dashboardUrl}`,
        status: response.status
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: `Authentication issue. Status: ${response.status}`,
        status: response.status
      };
    } else {
      return {
        success: false,
        message: `Dashboard API returned status: ${response.status}`,
        status: response.status
      };
    }
  } catch (error) {
    console.error('Dashboard API check failed:', error);
    return {
      success: false,
      message: `Error accessing dashboard: ${error.message}`
    };
  }
}; 