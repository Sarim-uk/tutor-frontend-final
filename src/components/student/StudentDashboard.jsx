import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Divider,
  CircularProgress,
  IconButton,
  Chip
} from '@mui/material';
import {
  AssignmentTurnedIn as AssignmentIcon,
  VideoCall as SessionIcon,
  CloudUpload as SubmitIcon,
  NoteAlt as NotesIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import StudentAssignments from './StudentAssignments';
import JoinSession from './JoinSession';
import SubmitAssignment from './SubmitAssignment';
import ViewNotes from './ViewNotes';

// Tab panel component
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-tabpanel-${index}`}
      aria-labelledby={`student-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}
      >
        <Typography variant="h4" component="h1">
          Student Dashboard
        </Typography>
        
        <Chip 
          icon={<AssignmentIcon />} 
          label={`Welcome, ${user?.first_name || 'Student'}`}
          color="primary"
          variant="outlined"
        />
      </Box>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="student dashboard tabs"
        >
          <Tab 
            icon={<AssignmentIcon />} 
            label="My Assignments" 
            id="student-tab-0"
            aria-controls="student-tabpanel-0"
          />
          <Tab 
            icon={<SessionIcon />} 
            label="Join Session" 
            id="student-tab-1"
            aria-controls="student-tabpanel-1"
          />
          <Tab 
            icon={<SubmitIcon />} 
            label="Submit Assignment" 
            id="student-tab-2"
            aria-controls="student-tabpanel-2"
          />
          <Tab 
            icon={<NotesIcon />} 
            label="View Note" 
            id="student-tab-3"
            aria-controls="student-tabpanel-3"
          />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <StudentAssignments />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <JoinSession />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <SubmitAssignment />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <ViewNotes />
      </TabPanel>
    </Box>
  );
};

export default StudentDashboard; 