import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  VideoCall as VideoIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Notes as NotesIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { format } from 'date-fns';
import { fadeIn, slideIn, pulse } from '../utils/animations';
import { useNavigate } from 'react-router-dom';
import { fetchSessionNotes, fetchSessionAssignments, fetchTutorSessions } from '../services/api';
import TutoringSession from './TutoringSession';
import SessionNotes from './SessionNotes';
import AISessionNotes from './AISessionNotes';

function Lessons() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [videoChatOpen, setVideoChatOpen] = useState(false);
  const user = useSelector(state => state.auth.user);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLessons = async () => {
      if (!user?.userId) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        
        // Fetch sessions (lessons)
        const sessionsData = await fetchTutorSessions();
        setLessons(sessionsData);

        // Fetch student details for each session
        const lessonsWithDetails = await Promise.all(
          sessionsData.map(async (session) => {
            // Fetch student details
            const studentResponse = await fetch(`http://localhost:8000/users/${session.student_ids}/`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              }
            });

            // Fetch notes for the session
            const notesResponse = await fetch(`http://localhost:8000/notes/session/${session.id}/`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              }
            });

            const studentData = await studentResponse.json();
            const notesData = notesResponse.ok ? await notesResponse.json() : null;

            return {
              ...session,
              student: studentData,
              notes: notesData,
            };
          })
        );

        setLessons(lessonsWithDetails);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching lessons:', err);
        setError('Failed to load lessons');
        setLoading(false);
      }
    };

    fetchLessons();
  }, [user?.userId]);

  const handleLessonClick = (lesson) => {
    setSelectedSession(lesson);
  };

  const handleJoinMeeting = (e, lesson) => {
    e.stopPropagation();
    setSelectedSession(lesson);
    setVideoChatOpen(true);
  };

  const handleCloseVideoChat = () => {
    setVideoChatOpen(false);
    setSelectedSession(null);
  };

  const handleViewNotes = async (lessonId) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) {
      setSelectedSession(lesson);
      setShowNotes(true);
    }
  };

  const handleViewAssignments = async (lessonId) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) {
      setSelectedSession(lesson);
      setShowAssignments(true);
    }
  };

  const LessonDialog = ({ lesson, onClose }) => {
    if (!lesson) return null;

    return (
      <Dialog 
        open={true} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            animation: `${fadeIn} 0.3s ease-out`,
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 2,
          bgcolor: 'primary.main',
          color: 'white'
        }}>
          <CalendarIcon />
          Lesson Details
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  Session Information
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CalendarIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="body1">
                        {format(new Date(lesson.scheduled_time), 'EEEE, MMMM d, yyyy')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <TimeIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="body1">
                        {format(new Date(lesson.scheduled_time), 'h:mm a')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="body1">
                        {lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name}` : 'Loading...'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  Meeting Link
                </Typography>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body1">
                        Use our integrated video conference system for this session.
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<VideoIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinMeeting(e, lesson);
                        }}
                        fullWidth
                      >
                        Join Session
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              
              {lesson.notes && (
                <Box>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Lesson Notes
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2">
                        {lesson.notes.content}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const NotesDialog = ({ lesson, onClose }) => {
    return (
      <Dialog 
        open 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'primary.main',
          color: 'white'
        }}>
          <Typography variant="h6">
            Session Notes - {lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name}` : 'Student'}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: 'calc(100% - 64px)' }}>
          <AISessionNotes sessionId={lesson.id} />
        </DialogContent>
      </Dialog>
    );
  };

  const AssignmentsDialog = ({ lesson, onClose }) => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      const loadAssignments = async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem('access_token');
          const response = await fetch(`http://localhost:8000/assignments/session/${lesson.id}/`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch assignments');
          }

          const data = await response.json();
          setAssignments(Array.isArray(data) ? data : [data]);
          setError(null);
        } catch (err) {
          console.error('Error fetching assignments:', err);
          setError(err.message || 'Unable to fetch assignments. Please try again.');
        } finally {
          setLoading(false);
        }
      };

      loadAssignments();
    }, [lesson.id]);

    return (
      <Dialog open onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Session Assignments
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {loading && (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {!loading && !error && assignments.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No assignments found for this session.
            </Alert>
          )}
          {assignments.length > 0 && (
            <List sx={{ mt: 2 }}>
              {assignments.map((assignment, index) => (
                <ListItem key={index} divider={index < assignments.length - 1}>
                  <ListItemText
                    primary={assignment.title}
                    secondary={assignment.description}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Calculate if the session is active (within 15 minutes before or 60 minutes after scheduled time)
  const isSessionActive = (lesson) => {
    // Removing time restrictions - all sessions are now active
    return true;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'primary.main' }}>
          My Lessons
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {lessons.some(lesson => isSessionActive(lesson)) && (
            <Chip
              icon={<VideoIcon />}
              label="Active Sessions Available"
              color="success"
              sx={{ 
                animation: `${pulse} 2s infinite`,
                fontWeight: 'medium',
                borderRadius: 1,
              }}
            />
          )}
          <Chip
            icon={<CalendarIcon />}
            label="Upcoming Sessions"
            color="primary"
            variant="outlined"
            sx={{ 
              fontWeight: 'medium',
              borderRadius: 1,
            }}
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Sort lessons to show active sessions first */}
        {lessons
          .sort((a, b) => {
            const aActive = isSessionActive(a);
            const bActive = isSessionActive(b);
            
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            
            // If both are active or both inactive, sort by date
            return new Date(a.scheduled_time) - new Date(b.scheduled_time);
          })
          .map((lesson, index) => {
            const active = isSessionActive(lesson);
            return (
              <Grid item xs={12} sm={6} md={4} key={lesson.id}>
                <Card 
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    animation: `${slideIn} 0.5s ease-out forwards ${index * 0.1}s`,
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: (theme) => theme.shadows[10],
                      '& .lesson-actions': {
                        opacity: 1,
                      }
                    },
                    position: 'relative',
                    overflow: 'visible',
                    borderLeft: active ? '4px solid' : 'none',
                    borderColor: 'success.main',
                  }}
                  onClick={() => handleLessonClick(lesson)}
                >
                  {active && (
                    <Chip 
                      label="Join Now!" 
                      color="success" 
                      size="small"
                      icon={<VideoIcon fontSize="small" />}
                      sx={{ 
                        position: 'absolute',
                        top: -10,
                        right: 16,
                        animation: `${pulse} 2s infinite`,
                        fontWeight: 'bold',
                        boxShadow: 2,
                      }}
                    />
                  )}
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        src={lesson.student?.profile_picture_url || `https://ui-avatars.com/api/?name=${lesson.student?.first_name}+${lesson.student?.last_name}`}
                        alt={`${lesson.student?.first_name} ${lesson.student?.last_name}`}
                        sx={{ mr: 2 }}
                      />
                      <Box>
                        <Typography variant="h6">
                          {lesson.student ? `${lesson.student.first_name} ${lesson.student.last_name}` : 'Loading...'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Student
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Divider sx={{ my: 1.5 }} />
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        {format(new Date(lesson.scheduled_time), 'EEEE, MMMM d, yyyy')}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TimeIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                      <Typography variant="body2">
                        {format(new Date(lesson.scheduled_time), 'h:mm a')}
                      </Typography>
                    </Box>
                    
                    <Box 
                      className="lesson-actions"
                      sx={{ 
                        display: 'flex',
                        gap: 1,
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        justifyContent: 'center',
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Tooltip title="Join Video Chat">
                        <IconButton 
                          color="primary"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinMeeting(e, lesson);
                          }}
                          sx={{ 
                            '&:hover': { 
                              bgcolor: 'primary.light',
                              transform: 'scale(1.1)'
                            },
                            animation: active ? `${pulse} 2s infinite` : 'none'
                          }}
                        >
                          <VideoIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Notes">
                        <IconButton 
                          color="primary" 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewNotes(lesson.id);
                          }}
                          sx={{ 
                            '&:hover': { 
                              bgcolor: 'primary.light',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <NotesIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Assignments">
                        <IconButton 
                          color="primary" 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAssignments(lesson.id);
                          }}
                          sx={{ 
                            '&:hover': { 
                              bgcolor: 'primary.light',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <AssignmentIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
      </Grid>

      {/* Video Chat Dialog */}
      {selectedSession && videoChatOpen && (
        <Dialog
          open={videoChatOpen}
          onClose={handleCloseVideoChat}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              height: '90vh',
              maxHeight: '90vh',
              margin: 0,
              borderRadius: 0,
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            bgcolor: 'primary.main',
            color: 'white'
          }}>
            <Typography variant="h6">
              Tutoring Session with {selectedSession?.student ? `${selectedSession.student.first_name} ${selectedSession.student.last_name}` : 'Student'}
            </Typography>
            <IconButton onClick={handleCloseVideoChat} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, height: '80vh' }}>
            <Box sx={{ height: '100%', position: 'relative' }}>
              <TutoringSession sessionId={selectedSession.id} />
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* Notes Dialog */}
      {showNotes && selectedSession && (
        <NotesDialog 
          lesson={selectedSession} 
          onClose={() => {
            setShowNotes(false);
            setSelectedSession(null);
          }} 
        />
      )}
      
      {/* Assignments Dialog */}
      {showAssignments && selectedSession && (
        <AssignmentsDialog 
          lesson={selectedSession} 
          onClose={() => {
            setShowAssignments(false);
            setSelectedSession(null);
          }} 
        />
      )}
    </Box>
  );
}

export default Lessons; 