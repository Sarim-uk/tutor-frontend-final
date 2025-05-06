import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRedirect = () => {
    navigate(user ? '/dashboard' : '/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'primary.main',
        py: 3
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="h1"
            sx={{
              color: 'primary.main',
              mb: 2,
              fontWeight: 'bold'
            }}
          >
            404
          </Typography>
          
          <Typography
            variant="h4"
            sx={{
              color: 'primary.main',
              mb: 3,
              textAlign: 'center'
            }}
          >
            Page Not Found
          </Typography>
          
          <Typography
            variant="body1"
            sx={{
              mb: 4,
              textAlign: 'center'
            }}
          >
            The page you are looking for does not exist or has been moved.
          </Typography>
          
          <Button
            variant="contained"
            color="secondary"
            onClick={handleRedirect}
            sx={{
              mt: 2
            }}
          >
            Go to {user ? 'Dashboard' : 'Login'}
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default NotFound; 