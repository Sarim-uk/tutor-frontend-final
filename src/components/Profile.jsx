import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  IconButton,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Email as EmailIcon,
  CalendarToday as JoinedIcon,
  School as RoleIcon,
  Group as StudentsIcon,
  VideoCall as MeetingIcon,
  Event as SessionIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { fetchTutorSessions, API_BASE_URL } from '../services/api';

function Profile({ onClose }) {
  const [profileData, setProfileData] = useState(null);
  const [tutorData, setTutorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        
        if (!token || !user?.userId) {
          throw new Error('Authentication required');
        }

        // Fetch user profile data
        const userResponse = await fetch(`${API_BASE_URL}/users/${user.userId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const userData = await userResponse.json();
        setProfileData(userData);

        // Fetch tutor-specific data
        const tutorResponse = await fetch(`${API_BASE_URL}/tutors/${user.userId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (tutorResponse.ok) {
          const tutorData = await tutorResponse.json();
          console.log('Tutor data received:', tutorData);  // Debug log
          setTutorData(tutorData);
        } else {
          console.error('Failed to fetch tutor data:', await tutorResponse.text());
        }

        // Fetch sessions to calculate stats
        const sessions = await fetchTutorSessions();
        const uniqueStudents = new Set(sessions.map(session => session.student_ids));
        
        setStats({
          totalStudents: uniqueStudents.size,
          totalSessions: sessions.length,
        });

      } catch (error) {
        console.error('Error in fetchProfileData:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  if (loading) {
    return (
      <DialogContent>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DialogContent>
    );
  }

  if (error) {
    return (
      <DialogContent>
        <Alert severity="error">{error}</Alert>
      </DialogContent>
    );
  }

  return (
    <>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Profile
        {onClose && (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Profile Overview */}
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar
                src={profileData?.profile_picture_url || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}`}
                alt={`${user?.firstName} ${user?.lastName}`}
                sx={{
                  width: 120,
                  height: 120,
                  margin: '0 auto 20px',
                  border: '4px solid',
                  borderColor: 'primary.main',
                }}
              />
              <Typography variant="h5" gutterBottom>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                {user?.role}
              </Typography>
            </Box>
          </Grid>

          {/* Profile Details */}
          <Grid item xs={12} md={8}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <EmailIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Email"
                  secondary={user?.email}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <StudentsIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Students"
                  secondary={`Teaching ${stats.totalStudents} students`}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <SessionIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Sessions"
                  secondary={`${stats.totalSessions} total sessions`}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <MeetingIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Personal Meeting Room"
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        This is your permanent meeting link for all students
                      </Typography>
                      <Link 
                        href={tutorData?.meeting_link} 
                        target="_blank" 
                        rel="noopener"
                        sx={{ wordBreak: 'break-all' }}
                      >
                        {tutorData?.meeting_link || 'Not set'}
                      </Link>
                    </>
                  }
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </DialogContent>
    </>
  );
}

export default Profile; 