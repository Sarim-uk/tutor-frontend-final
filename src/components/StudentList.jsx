import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Avatar, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import { useSelector } from 'react-redux';

function StudentList() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/users/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }

        const data = await response.json();
        // Filter only students from the users list
        const studentsList = data.filter(user => user.role === 'Student');
        setStudents(studentsList);
      } catch (error) {
        console.error('Error fetching students:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

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
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Your Students
      </Typography>
      
      <Grid container spacing={3}>
        {students.length > 0 ? (
          students.map((student) => (
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
                        Joined: {new Date(student.created_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Alert severity="info">
              No students assigned to you yet.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default StudentList;
