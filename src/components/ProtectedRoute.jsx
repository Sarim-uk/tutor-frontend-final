import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * A wrapper for protected routes that requires authentication
 * Redirects to login if not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading, initialized } = useAuth();
  const location = useLocation();

  // While auth is still loading, show a loading spinner
  if (loading || !initialized) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress size={50} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Verifying session...
        </Typography>
      </Box>
    );
  }

  // If not authenticated, redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected content
  return children;
};

export default ProtectedRoute; 