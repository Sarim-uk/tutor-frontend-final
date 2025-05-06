import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login as reduxLogin } from '../redux/authSlice';
import { loginUser, API_BASE_URL, isSessionValid } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { checkApiHealth, checkForCorsIssues } from '../utils/apiHealthCheck';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Container,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Collapse,
  Link
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const [checkingApi, setCheckingApi] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { login: authLogin, user, initialized } = useAuth();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (initialized && user) {
      navigate('/dashboard');
    }
  }, [user, navigate, initialized]);

  // Check if there's an active session on mount
  useEffect(() => {
    // If we have a valid token but no user in context,
    // we should redirect to dashboard to trigger auth reload
    if (initialized && !user && isSessionValid()) {
      navigate('/dashboard');
    }
  }, [initialized, user, navigate]);

  // Check API health when the component mounts
  useEffect(() => {
    const runApiHealthCheck = async () => {
      setCheckingApi(true);
      try {
        const healthStatus = await checkApiHealth();
        const corsStatus = await checkForCorsIssues();
        
        setApiStatus({
          health: healthStatus,
          cors: corsStatus
        });
      } catch (err) {
        console.error('Failed to check API health:', err);
        setApiStatus({
          health: { success: false, message: 'Failed to check API health' },
          cors: { hasCorsIssue: false, message: 'Unable to check for CORS issues' }
        });
      } finally {
        setCheckingApi(false);
      }
    };
    
    runApiHealthCheck();
  }, []);

  const handleCheckApi = async () => {
    setCheckingApi(true);
    try {
      const healthStatus = await checkApiHealth();
      const corsStatus = await checkForCorsIssues();
      
      setApiStatus({
        health: healthStatus,
        cors: corsStatus
      });
      
      if (healthStatus.success) {
        setError('');
      } else {
        setError(`Connection issue: ${healthStatus.message}`);
        setShowDebugInfo(true);
      }
    } catch (err) {
      console.error('Failed to check API health:', err);
      setError('Failed to check API connection. Please try again.');
    } finally {
      setCheckingApi(false);
    }
  };

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Try to log in with the API service
      const response = await loginUser(email, password);
      
      // Create user object for context and Redux state
      const userData = {
        userId: response.user.id,
        id: response.user.id,
        email: response.user.email,
        role: response.user.role.toLowerCase(),
        firstName: response.user.first_name,
        lastName: response.user.last_name,
        first_name: response.user.first_name,
        last_name: response.user.last_name
      };

      // Check for valid role in the response
      if (userData.role !== 'tutor' && userData.role !== 'teacher') {
        setError('Access denied. Only tutors and teachers can access this platform.');
        setIsSubmitting(false);
        return;
      }

      // Update Redux state
      dispatch(reduxLogin(userData));
      
      // Update Auth context (which will handle token storage via saveUserSession)
      authLogin(userData, {
        access_token: response.access_token,
        refresh_token: response.refresh_token
      });
      
      // Navigate to dashboard or intended page
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Check for network error specifically
      if (error.message && error.message.includes('Cannot connect to the server')) {
        setError(`Network Error: ${error.message}`);
        setShowDebugInfo(true);
      } else {
        setError(error.message || 'Invalid credentials. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
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
            component="h1"
            variant="h4"
            sx={{
              color: 'primary.main',
              mb: 3,
              fontWeight: 'bold'
            }}
          >
            Welcome to Nexus Academy!
          </Typography>
          
          <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!error && error.includes('email')}
              disabled={isSubmitting}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!error && error.includes('password')}
              disabled={isSubmitting}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Server connection status */}
            {apiStatus && !apiStatus.health.success && (
              <Alert 
                severity="warning" 
                sx={{ mt: 2 }}
              >
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  Backend server connection issue detected. The server may be running but login might still work.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button 
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={handleCheckApi}
                    disabled={checkingApi}
                    size="small"
                  >
                    {checkingApi ? 'Checking...' : 'Check connection'}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleLogin}
                    disabled={isSubmitting}
                    size="small"
                  >
                    Try Login Anyway
                  </Button>
                </Box>
              </Alert>
            )}

            {error && (
              <Alert 
                severity="error" 
                sx={{ mt: 2 }}
                action={
                  error.includes('connect to the server') && (
                    <IconButton
                      color="inherit"
                      size="small"
                      onClick={() => setShowDebugInfo(!showDebugInfo)}
                    >
                      <InfoIcon />
                    </IconButton>
                  )
                }
              >
                {error}
              </Alert>
            )}

            {/* Debug information for network errors */}
            <Collapse in={showDebugInfo}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Debug Information:</Typography>
                <ul>
                  <li>API URL: {API_BASE_URL}</li>
                  <li>Expected backend endpoint: {`${API_BASE_URL}/login/`}</li>
                  {apiStatus && (
                    <>
                      <li>Server health check: {apiStatus.health.message}</li>
                      {apiStatus.cors.hasCorsIssue && (
                        <li>CORS issue: {apiStatus.cors.message}</li>
                      )}
                    </>
                  )}
                  <li>
                    <strong>Troubleshooting steps:</strong>
                    <ol>
                      <li>Ensure the backend server is running</li>
                      <li>Check that the API URL in the `.env` file is correct</li>
                      <li>Verify the login endpoint exists at {`${API_BASE_URL}/login/`}</li>
                      <li>Check CORS settings in the backend settings.py file</li>
                      <li>
                        <strong>Note:</strong> The 405 Method Not Allowed error for HEAD requests is normal for Django. 
                        You can still try to log in directly.
                      </li>
                    </ol>
                  </li>
                </ul>
              </Alert>
            </Collapse>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting || (apiStatus && !apiStatus.health.success)}
              sx={{
                mt: 3,
                mb: 2,
                bgcolor: 'secondary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'secondary.dark',
                },
              }}
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;
