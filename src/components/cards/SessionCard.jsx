import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Avatar, Chip, IconButton, Dialog, Button } from '@mui/material';
import { format, isToday as isDateToday } from 'date-fns';
import { 
  AccessTime as TimeIcon,
  VideoCall as VideoIcon,
  Event as EventIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { fadeIn, pulse } from '../../utils/animations';
import VideoChat from '../VideoChat';

function SessionCard({ session, index }) {
  const [studentName, setStudentName] = useState('');
  const [studentAvatar, setStudentAvatar] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [videoChatOpen, setVideoChatOpen] = useState(false);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/users/${session.student_ids}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStudentName(`${data.first_name} ${data.last_name}`);
          setStudentAvatar(data.profile_picture_url || `https://ui-avatars.com/api/?name=${data.first_name}+${data.last_name}`);
          setStudentData(data);
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
      }
    };

    if (session.student_ids) {
      fetchStudentDetails();
    }
  }, [session.student_ids]);

  // Format the date and time
  const sessionDate = new Date(session.scheduled_time);
  const formattedTime = format(sessionDate, 'h:mm a');
  const formattedDate = format(sessionDate, 'EEEE, MMMM d');

  // Calculate if the session is today
  const isToday = isDateToday(sessionDate);
  
  // Calculate if the session is active (within 15 minutes before or 60 minutes after scheduled time)
  // Removing time restrictions - all sessions are now active
  const isSessionActive = true;

  const handleJoinVideoChat = () => {
    setVideoChatOpen(true);
  };

  const handleCloseVideoChat = () => {
    setVideoChatOpen(false);
  };

  return (
    <>
      <Card 
        sx={{ 
          mb: 2,
          border: isToday ? 2 : 0,
          borderColor: isToday ? 'primary.main' : 'transparent',
          transition: 'all 0.3s ease-in-out',
          animation: `${fadeIn} 0.5s ease-out forwards ${index * 0.1}s`,
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: (theme) => theme.shadows[10],
            '& .session-icons': {
              opacity: 1,
            }
          },
          background: (theme) => `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.primary.light} 100%)`,
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar 
              src={studentAvatar}
              alt={studentName}
              sx={{ 
                mr: 2,
                width: 60,
                height: 60,
                border: '3px solid',
                borderColor: 'primary.main',
                animation: isToday ? `${pulse} 2s infinite` : 'none',
              }}
            />
            <Box flex={1}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {studentName || 'Loading...'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Student
              </Typography>
            </Box>
            <Box 
              className="session-icons"
              sx={{ 
                opacity: isSessionActive ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
                display: 'flex',
                gap: 1
              }}
            >
              <IconButton 
                color="primary" 
                size="small"
                onClick={handleJoinVideoChat}
                disabled={!isSessionActive}
                title={isSessionActive ? "Join Video Chat" : "Session not active"}
                sx={{
                  backgroundColor: isSessionActive ? 'rgba(25, 118, 210, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: isSessionActive ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                  }
                }}
              >
                <VideoIcon />
              </IconButton>
              <IconButton color="primary" size="small">
                <EventIcon />
              </IconButton>
            </Box>
          </Box>

          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
              p: 1,
              borderRadius: 1,
              bgcolor: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            <TimeIcon color="primary" fontSize="small" />
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {formattedTime}
            </Typography>
          </Box>

          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontStyle: 'italic',
              mt: 1
            }}
          >
            {formattedDate}
          </Typography>

          {isToday && (
            <Box mt={2} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Chip 
                label="Today's Session" 
                color="primary" 
                size="small" 
                sx={{ 
                  borderRadius: 1,
                  animation: `${pulse} 2s infinite`,
                  fontWeight: 'bold'
                }}
              />
              
              {isSessionActive && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<VideoIcon />}
                  onClick={handleJoinVideoChat}
                  sx={{ 
                    animation: `${pulse} 2s infinite`,
                    boxShadow: 3
                  }}
                >
                  Join Now
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Video Chat Dialog */}
      <Dialog
        open={videoChatOpen}
        onClose={handleCloseVideoChat}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '900px',
          }
        }}
      >
        <Box sx={{ position: 'relative', height: '100%' }}>
          <IconButton
            onClick={handleCloseVideoChat}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white',
              bgcolor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10,
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.7)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          
          <VideoChat
            sessionId={session.id}
            participant={studentData}
            onClose={handleCloseVideoChat}
          />
        </Box>
      </Dialog>
    </>
  );
}

export default SessionCard; 