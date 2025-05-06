import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Paper, Container } from '@mui/material';
import ZegoRoom from '../components/ZegoRoom';
import { useAuth } from '../contexts/AuthContext';

const VideoRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    setIsLoading(false);
  }, [isAuthenticated, navigate]);

  const handleLeaveRoom = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading room...
        </Typography>
      </Box>
    );
  }

  if (!user || !user.id) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: 3
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            maxWidth: 'sm', 
            width: '100%', 
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <Typography variant="h5" color="error" gutterBottom>
            Authentication Required
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            You need to be logged in to join a video room.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Video Session Room
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Room ID: {roomId}
          </Typography>
        </Box>
        
        <Paper 
          elevation={3} 
          sx={{ 
            height: '70vh', 
            minHeight: '600px', 
            overflow: 'hidden'
          }}
        >
          <ZegoRoom
            roomId={roomId}
            userId={user.id}
            userName={user.name || `Teacher-${user.id}`}
            role="Host"
            onLeaveRoom={handleLeaveRoom}
          />
        </Paper>
      </Container>
    </Box>
  );
};

export default VideoRoom; 