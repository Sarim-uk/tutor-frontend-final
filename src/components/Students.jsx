import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button
} from '@mui/material';
import { fetchTutorSessions, fetchStudentProgress } from '../services/api';
import { format, parseISO } from 'date-fns';
import axios from 'axios';

function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentProgress, setStudentProgress] = useState({});
  const [creatingProgress, setCreatingProgress] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  const fetchData = async () => {
    try {
      setLoading(true);
      const sessions = await fetchTutorSessions();
      console.log('Sessions data:', sessions);
      
      if (!sessions || sessions.length === 0) {
        console.log('No sessions found');
        setStudents([]);
        setLoading(false);
        return;
      }
      
      // Extract student UUIDs from sessions
      const studentUUIDs = sessions.map(session => session.student_uuid);
      console.log('Student UUIDs from sessions:', studentUUIDs);
      
      // Get unique students from sessions
      const uniqueStudents = new Map();
      
      for (const session of sessions) {
        if (!session.student || !session.student_uuid) {
          console.log('Session missing student data:', session);
          continue;
        }
        
        const studentUUID = session.student_uuid;
        const studentData = session.student;
        
        if (!uniqueStudents.has(studentUUID)) {
          console.log(`Adding student with UUID ${studentUUID} to unique students map:`, studentData);
          uniqueStudents.set(studentUUID, {
            id: studentUUID,
            numeric_id: studentData.numeric_id,
            first_name: studentData.first_name,
            last_name: studentData.last_name,
            email: studentData.email,
            profile_picture_url: studentData.profile_picture_url,
            created_at: studentData.created_at
          });
        }
      }

      const studentsArray = Array.from(uniqueStudents.values());
      console.log('Unique students array:', studentsArray);
      setStudents(studentsArray);

      // Fetch progress for each student
      const progressData = {};
      
      for (const student of studentsArray) {
        try {
          // Get the actual student UUID from the student object
          const studentUUID = student.id;
          console.log(`Fetching progress for student UUID: ${studentUUID}`);
          
          // Check if the student UUID is valid
          if (!studentUUID) {
            console.warn(`Skipping invalid student UUID: ${studentUUID}`);
            progressData[studentUUID] = [];
            continue;
          }
          
          const progress = await fetchStudentProgress(studentUUID);
          console.log(`Progress data for ${studentUUID}:`, progress);
          progressData[studentUUID] = progress;
        } catch (error) {
          console.error(`Error loading progress for ${student.id}:`, error);
          progressData[student.id] = [];
        }
      }
      
      console.log('All progress data:', progressData);
      setStudentProgress(progressData);

    } catch (err) {
      console.error('Error fetching students data:', err);
      setError(err.message || 'Failed to load students data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = parseISO(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const createSampleProgress = async (studentId) => {
    try {
      // Skip invalid student IDs
      if (!studentId) {
        console.warn(`Cannot create progress for invalid student UUID: ${studentId}`);
        return;
      }
      
      setCreatingProgress(true);
      console.log(`Creating sample progress for student UUID: ${studentId}`);
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/progress/create-sample/${studentId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Created sample progress:', response.data);
      
      // Refresh the data
      await fetchData();
      
    } catch (error) {
      console.error('Error creating sample progress:', error);
      setError('Failed to create sample progress data');
    } finally {
      setCreatingProgress(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchData}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        My Students
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </Box>

      {students.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          You don't have any students yet.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Student Overview Cards */}
          {students.map((student) => (
            <Grid item xs={12} sm={6} md={4} key={student.id}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar 
                      src={student.profile_picture_url} 
                      alt={`${student.first_name} ${student.last_name}`}
                      sx={{ width: 56, height: 56 }}
                    />
                    <Box>
                      <Typography variant="h6">
                        {student.first_name} {student.last_name}
                      </Typography>
                      <Typography color="textSecondary">
                        {student.email}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Joined: {formatJoinDate(student.created_at)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        UUID: {student.id}
                      </Typography>
                      {student.numeric_id && (
                        <Typography variant="body2" color="textSecondary">
                          Numeric ID: {student.numeric_id}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Student Progress Table */}
          <Grid item xs={12}>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Student Progress Tracking</h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concentration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentProgress[students[0].id].map((progress) => (
                      <tr key={progress.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {students[0].first_name} {students[0].last_name}
                              </div>
                              <div className="text-sm text-gray-500">{students[0].email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500" 
                                style={{ width: `${progress.attendance}%` }}
                              />
                            </div>
                            <span className="ml-2 text-sm text-gray-600">{progress.attendance}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${progress.peformance}%` }}
                              />
                            </div>
                            <span className="ml-2 text-sm text-gray-600">{progress.peformance}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500" 
                                style={{ width: `${progress.concentration}%` }}
                              />
                            </div>
                            <span className="ml-2 text-sm text-gray-600">{progress.concentration}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                          {progress.comments}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {progress.created_at ? (
                            new Date(progress.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          ) : (
                            <span className="text-red-500">Date unavailable</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {studentProgress[students[0].id].length === 0 && (
                <div className="mt-4 text-center text-gray-500">
                  No progress records found for selected students
                </div>
              )}
            </div>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Students;
