import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Breadcrumbs,
  Link as MuiLink,
  Divider
} from '@mui/material';
import { ArrowBack, Analytics, Timeline, Assessment } from '@mui/icons-material';
import EmotionAnalyticsDashboard from '../components/analytics/EmotionAnalyticsDashboard';
import { useAuth } from '../contexts/AuthContext';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SessionAnalytics = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  
  // Check if user is a tutor
  useEffect(() => {
    if (user && !user.is_tutor) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink 
          component="button"
          variant="body2"
          onClick={() => navigate('/dashboard')}
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          Dashboard
        </MuiLink>
        <MuiLink 
          component="button"
          variant="body2"
          onClick={() => navigate('/sessions')}
          underline="hover"
        >
          Sessions
        </MuiLink>
        <Typography color="text.primary">Analytics</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={handleBackClick}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Session Analytics
        </Typography>
      </Box>
      
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Session ID: {sessionId}
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<Timeline />} label="Emotion Analytics" />
          <Tab icon={<Assessment />} label="Performance Metrics" disabled />
          <Tab icon={<Analytics />} label="Session Summary" disabled />
        </Tabs>
      </Paper>
      
      {/* Tab Content */}
      <Paper>
        <TabPanel value={tabValue} index={0}>
          <EmotionAnalyticsDashboard sessionId={sessionId} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Performance metrics coming soon
            </Typography>
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Session summary coming soon
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default SessionAnalytics; 