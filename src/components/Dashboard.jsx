import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Card,
  CardContent,
  IconButton,
  useTheme,
  Collapse,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Avatar,
  Divider,
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Book as LessonsIcon,
  Assignment as AssignmentsIcon,
  People as StudentsIcon,
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
  Person as ProfileIcon,
  School as SchoolIcon,
  Notifications as NotificationsIcon,
  Event as EventIcon,
  EventNote as EventNoteIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  VideoCall as VideoCallIcon,
  Timeline as TimelineIcon,
  AccessTime as AccessTimeIcon,
  DateRange as DateRangeIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as AvailabilityIcon
} from '@mui/icons-material';
import Students from './Students'; // Import the Students component
import './styles/Dashboard.css';
import Navbar from './Navbar'; // Add this import
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchTutorSessions, 
  fetchStudentProgress, 
  fetchTutorMeetingInfo,
  fetchStudentNotes,
  fetchDashboardData,
  API_BASE_URL,
  fetchStudentSummary,
  fetchAssignmentStats,
  fetchUpcomingSessions,
  fetchRecentActivity
} from '../services/api';
import SessionCard from './cards/SessionCard';
import ProgressCard from './cards/ProgressCard';
import NoteCard from './cards/NoteCard';
import Profile from './Profile';
import Lessons from './Lessons';
import AssignmentDashboard from './assignment/AssignmentDashboard'; // Import AssignmentDashboard
import AvailabilityManagement from './AvailabilityManagement'; // Import the AvailabilityManagement component
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { checkDashboardEndpoint } from '../utils/apiHealthCheck';
import { format, isToday, isTomorrow, formatDistance } from 'date-fns';

function Dashboard() {
  const [open, setOpen] = useState(true);
  const [view, setView] = useState('dashboard'); // Manage which section is visible
  const [stats, setStats] = useState({
    totalStudents: 0,
    upcomingSessions: [],
    pendingAssignments: 0,
    recentActivity: [],
    notifications: []
  });
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching all dashboard data...');
        
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        // Check if user is available and has necessary properties
        if (!user) {
          console.warn('User data not available for dashboard fetching');
          setError('User information is not available. Please try logging in again.');
          setIsLoading(false);
          return;
        }
        
        try {
          // Fetch multiple data sources in parallel
          const [
            studentData,
            sessionsData,
            assignmentData,
            activityData
          ] = await Promise.all([
            fetchStudentSummary(),
            fetchUpcomingSessions(),
            fetchAssignmentStats(),
            fetchRecentActivity(10)
          ]);
          
          // Filter students to only include those enrolled with this tutor
          // Use either id or userId depending on what's available
          const tutorId = user.id || user.userId;
          const tutorStudents = studentData.filter(student => 
            student.tutor_id === tutorId || student.tutor_id === user.tutor_id
          );
          
          setStudents(tutorStudents);
          setSessions(sessionsData);
          setAssignments(assignmentData);
          setActivities(activityData);
          
          // Update summary statistics
          setStats({
            totalStudents: tutorStudents.length || 0,
            upcomingSessions: sessionsData || [],
            pendingAssignments: assignmentData.length || 0,
            recentActivity: activityData || [],
            notifications: []
          });
          
          console.log('Dashboard data loaded successfully');
        } catch (err) {
          console.error('Error fetching dashboard data:', err);
          setError(`Failed to load dashboard data: ${err.message}`);
          
          // Set empty defaults
          setStats({
            totalStudents: 0,
            upcomingSessions: [],
            pendingAssignments: 0,
            recentActivity: [],
            notifications: []
          });
        }
      } catch (err) {
        console.error('Dashboard error:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllData();
  }, [user]);

  // Handle navigation for performance view
  useEffect(() => {
    if (view === 'performance') {
      navigate('/student-performance');
    }
  }, [view, navigate]);

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, view: 'dashboard' },
    { text: 'Lessons', icon: <SchoolIcon />, view: 'lessons' },
    { text: 'Assignments', icon: <AssignmentsIcon />, view: 'assignments' },
    { text: 'Students', icon: <StudentsIcon />, view: 'students' },
    { text: 'Performance', icon: <TimelineIcon />, view: 'performance' },
    { text: 'Availability', icon: <AvailabilityIcon />, view: 'availability' },
    { text: 'Profile', icon: <ProfileIcon />, view: 'profile' }
  ];
  console.log("talha is here");

  const handleStartMeeting = (sessionId) => {
    const session = stats.upcomingSessions.find(s => s.id === sessionId);
    if (session && session.meeting_link) {
      window.open(session.meeting_link, '_blank');
    } else {
      // Create a fallback Google Meet link using the session ID
      window.open(`https://meet.google.com/lookup/${sessionId}`, '_blank');
    }
  };

  const getSessionStatusChip = (session) => {
    const sessionDate = new Date(session.scheduled_time);
    const now = new Date();
    
    if (sessionDate < now) {
      return <Chip size="small" label="Completed" color="default" />;
    } else if (isToday(sessionDate)) {
      const timeDiff = sessionDate.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));
      
      if (minutesDiff <= 30 && minutesDiff > 0) {
        return <Chip size="small" label="Starting Soon" color="warning" sx={{ fontWeight: 'bold' }} />;
      } else if (minutesDiff <= 0 && minutesDiff > -60) {
        return <Chip size="small" label="In Progress" color="success" sx={{ fontWeight: 'bold' }} />;
      } else {
        return <Chip size="small" label="Today" color="primary" />;
      }
    } else if (isTomorrow(sessionDate)) {
      return <Chip size="small" label="Tomorrow" color="info" />;
    } else {
      return <Chip size="small" label="Upcoming" color="default" />;
    }
  };

  const formatDateTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return `Today at ${format(date, 'h:mm a')}`;
      } else if (isTomorrow(date)) {
        return `Tomorrow at ${format(date, 'h:mm a')}`;
      } else {
        return format(date, 'MMM d, yyyy h:mm a');
      }
    } catch (e) {
      return dateStr || 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <CircularProgress size={60} thickness={4} sx={{ color: '#052453' }} />
        <Typography variant="h6" sx={{ mt: 2, color: '#052453' }}>
          Loading your dashboard...
        </Typography>
      </Box>
    );
  }

  if (error && !error.includes('404')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6" component="div" sx={{ mb: 1 }}>
            Error Loading Dashboard
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Box>
            <Typography variant="subtitle2" component="div">Debugging Information:</Typography>
            <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px', fontSize: '12px' }}>
              {JSON.stringify({
                API_URL: API_BASE_URL,
                endpoints: {
                  dashboard: `${API_BASE_URL}/api/dashboard/`,
                  sessions: `${API_BASE_URL}/sessions/`
                },
                hasToken: !!localStorage.getItem('access_token'),
                user: user ? { role: user.role, email: user.email } : null
              }, null, 2)}
            </pre>
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }

  // Don't render performance in the main content area since we're navigating away
  const renderContent = () => {
    if (view === 'performance') return null;
    
    return (
      <>
        {view === 'dashboard' && renderDashboardContent()}
        {view === 'lessons' && <Lessons />}
        {view === 'assignments' && <AssignmentDashboard />}
        {view === 'students' && <Students />}
        {view === 'profile' && <Profile />}
        {view === 'availability' && <AvailabilityManagement />}
      </>
    );
  };

  // Render the main dashboard content
  const renderDashboardContent = () => {
    return (
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }}>
        {/* Welcome message with current date */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2 
        }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#052453' }}>
              Welcome back, {user?.firstName || 'Teacher'}!
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </Typography>
          </Box>
          <Avatar 
            src={user?.profilePicture} 
            alt={user?.firstName}
            sx={{ 
              width: 56, 
              height: 56,
              border: '2px solid',
              borderColor: 'primary.main'
            }}
          />
        </Box>

        {/* Quick Stats Cards */}
        <Grid container spacing={3}>
          {/* Total Students Stats Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={2}
              sx={{ 
                borderRadius: 2,
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardContent sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                    Total Students
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#052453' }}>
                    {stats.totalStudents}
                  </Typography>
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: '#f0f4ff', 
                    color: '#052453',
                    width: 56,
                    height: 56
                  }}
                >
                  <StudentsIcon fontSize="large" />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          {/* Today's Sessions Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={2}
              sx={{ 
                borderRadius: 2,
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardContent sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                    Today's Sessions
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#052453' }}>
                    {stats.upcomingSessions.filter(session => 
                      isToday(new Date(session.scheduled_time))
                    ).length}
                  </Typography>
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: '#fff4e5', 
                    color: '#ff8f00',
                    width: 56,
                    height: 56
                  }}
                >
                  <EventIcon fontSize="large" />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>

          {/* Pending Assignments Card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              elevation={2}
              sx={{ 
                borderRadius: 2,
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}
            >
              <CardContent sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                    Pending Assignments
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#052453' }}>
                    {stats.pendingAssignments}
                  </Typography>
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: '#e8f5e9', 
                    color: '#2e7d32',
                    width: 56,
                    height: 56
                  }}
                >
                  <AssignmentTurnedInIcon fontSize="large" />
                </Avatar>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Upcoming Sessions Section */}
        <Box>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#052453', display: 'flex', alignItems: 'center' }}>
            <EventNoteIcon sx={{ mr: 1 }} />
            Upcoming Sessions
          </Typography>
          
          {stats.upcomingSessions.length > 0 ? (
            <Grid container spacing={2}>
              {stats.upcomingSessions.slice(0, 3).map(session => (
                <Grid item xs={12} sm={6} md={4} key={session.id}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      borderRadius: 2,
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 6
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        {getSessionStatusChip(session)}
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} />
                          {format(new Date(session.scheduled_time), 'h:mm a')}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar 
                          src={session.student?.profile_picture_url} 
                          alt={session.student?.first_name}
                          sx={{ mr: 2 }}
                        />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {session.student?.first_name} {session.student?.last_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatDateTime(session.scheduled_time)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      <Button
                        variant="contained"
                        startIcon={<VideoCallIcon />}
                        fullWidth
                        onClick={() => handleStartMeeting(session.id)}
                        sx={{ 
                          mt: 1,
                          bgcolor: isToday(new Date(session.scheduled_time)) ? '#052453' : 'primary.main'
                        }}
                      >
                        {isToday(new Date(session.scheduled_time)) ? 'Join Session' : 'View Details'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No upcoming sessions scheduled
            </Alert>
          )}
          
          {stats.upcomingSessions.length > 3 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => setView('lessons')}
              >
                View All Sessions
              </Button>
            </Box>
          )}
        </Box>

        {/* Recent Activity Section */}
        <Box>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#052453', display: 'flex', alignItems: 'center' }}>
            <TimelineIcon sx={{ mr: 1 }} />
            Recent Activity
          </Typography>
          
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.slice(0, 5).map((activity, index) => (
                  <React.Fragment key={activity.id || index}>
                    <ListItem alignItems="flex-start">
                      <ListItemIcon>
                        <Avatar 
                          sx={{ 
                            bgcolor: activity.type === 'session' ? '#e3f2fd' : '#e8f5e9',
                            color: activity.type === 'session' ? '#1565c0' : '#2e7d32'
                          }}
                        >
                          {activity.type === 'session' ? <EventIcon /> : <AssignmentIcon />}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          <React.Fragment>
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {activity.type === 'session' ? 'Scheduled Session' : 'Assignment'}
                            </Typography>
                            {" — "}{formatDateTime(activity.time)}
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    {index < stats.recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No recent activity" />
                </ListItem>
              )}
            </List>
          </Card>
        </Box>

        {/* Student Progress Overview */}
        <Box>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#052453', display: 'flex', alignItems: 'center' }}>
            <PeopleIcon sx={{ mr: 1 }} />
            Student Overview
          </Typography>
          
          <Grid container spacing={2}>
            {students.slice(0, 4).map((student, index) => (
              <Grid item xs={12} sm={6} lg={3} key={student.id || index}>
                <Card 
                  elevation={2}
                  sx={{
                    borderRadius: 2,
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Avatar
                      src={student.profile_picture_url}
                      alt={student.first_name}
                      sx={{ 
                        width: 80, 
                        height: 80, 
                        mx: 'auto',
                        mb: 2,
                        border: '3px solid',
                        borderColor: 'primary.main'
                      }}
                    />
                    <Typography variant="h6">{student.first_name} {student.last_name}</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {student.email}
                    </Typography>
                    
                    <Divider sx={{ my: 1.5 }} />
                    
                    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                      <Chip 
                        label={`${stats.upcomingSessions.filter(s => 
                          s.student_ids === student.id).length} Sessions`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {students.length > 4 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => setView('students')}
              >
                View All Students
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      <Navbar open={open} />
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? 240 : 65,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? 240 : 65,
            backgroundColor: '#052453',
            color: '#c2a23d',
            transition: theme.transitions.create(['width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            zIndex: theme.zIndex.drawer
          },
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: open ? 'space-between' : 'center',
          padding: 2 
        }}>
          <Collapse orientation="horizontal" in={open}>
            <Typography variant="h6" sx={{ color: '#c2a23d' }}>
              Nexus Academy
            </Typography>
          </Collapse>
          <IconButton 
            onClick={() => setOpen(!open)}
            sx={{ color: '#c2a23d' }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        </Box>

        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                selected={view === item.view}
                onClick={() => setView(item.view)}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  '&:hover': {
                    backgroundColor: 'rgba(194, 162, 61, 0.08)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(194, 162, 61, 0.16)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                    color: '#c2a23d',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <Collapse orientation="horizontal" in={open}>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      opacity: open ? 1 : 0,
                      color: '#c2a23d'
                    }} 
                  />
                </Collapse>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          backgroundColor: '#f8f9fa',
          position: 'relative',
          pt: { xs: 10, sm: 12 },
          px: 3,
          pb: 3,
          display: 'flex',
          flexDirection: 'column',
          width: `calc(100% - ${open ? 240 : 65}px)`,
          transition: theme.transitions.create(['width', 'margin-left'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {user?.role?.toLowerCase() !== 'tutor' && user?.role?.toLowerCase() !== 'teacher' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Access restricted. Only tutors can view this dashboard.
          </Alert>
        )}

        {renderContent()}

        {error && error.includes('404') && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
              Dashboard (Offline Mode)
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body1">
                Dashboard data could not be loaded from the API. Showing limited functionality in offline mode.
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                sx={{ mt: 1 }}
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                      Quick Links
                    </Typography>
                    <List>
                      <ListItem button onClick={() => setView('students')}>
                        <ListItemIcon><StudentsIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="View Students" />
                      </ListItem>
                      <ListItem button onClick={() => setView('profile')}>
                        <ListItemIcon><ProfileIcon color="primary" /></ListItemIcon>
                        <ListItemText primary="My Profile" />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6} lg={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                      User Information
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon><ProfileIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary={`${user?.firstName || ''} ${user?.lastName || ''}`} 
                          secondary={user?.email || ''}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><SchoolIcon color="primary" /></ListItemIcon>
                        <ListItemText 
                          primary="Role" 
                          secondary={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default Dashboard;
