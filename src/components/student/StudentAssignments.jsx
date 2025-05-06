import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  AssignmentTurnedIn as AssignmentIcon,
  Schedule as ScheduleIcon,
  Upload as UploadIcon,
  CheckCircle as CompletedIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

// This will be replaced with actual API call
const fetchStudentAssignments = async () => {
  // Simulated API response for development
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
          title: 'Math Problem Set',
          description: 'Complete problems 1-10 on page 35 of the textbook.',
          due_date: new Date(Date.now() + 86400000 * 3), // 3 days from now
          status: 'Pending',
          max_score: 100
        },
        {
          id: '2',
          title: 'Science Lab Report',
          description: 'Write a report on the latest lab experiment.',
          due_date: new Date(Date.now() + 86400000 * 7), // 7 days from now
          status: 'Pending',
          max_score: 50
        },
        {
          id: '3',
          title: 'English Essay',
          description: 'Write a 500-word essay on the given topic.',
          due_date: new Date(Date.now() - 86400000 * 1), // 1 day ago
          status: 'Pending',
          max_score: 100
        },
        {
          id: '4',
          title: 'History Research',
          description: 'Research a historical event and submit a summary.',
          due_date: new Date(Date.now() + 86400000 * 14), // 14 days from now
          status: 'Completed',
          max_score: 100,
          score: 85
        }
      ]);
    }, 1000);
  });
};

const AssignmentCard = ({ assignment }) => {
  const isPastDue = new Date(assignment.due_date) < new Date();
  const isCompleted = assignment.status === 'Completed';
  
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        },
        borderLeft: isCompleted ? '5px solid #4caf50' : isPastDue ? '5px solid #f44336' : '5px solid #2196f3'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="div">
            {assignment.title}
          </Typography>
          {isCompleted ? (
            <Chip 
              icon={<CompletedIcon />} 
              label="Completed" 
              color="success" 
              size="small" 
            />
          ) : isPastDue ? (
            <Chip 
              icon={<ScheduleIcon />} 
              label="Past Due" 
              color="error" 
              size="small" 
            />
          ) : (
            <Chip 
              icon={<ScheduleIcon />} 
              label="Due Soon" 
              color="primary" 
              size="small" 
            />
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          <strong>Due:</strong> {format(new Date(assignment.due_date), 'MMM d, yyyy • h:mm a')}
        </Typography>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          {assignment.description}
        </Typography>
        
        {isCompleted && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Score:</strong> {assignment.score}/{assignment.max_score} 
              ({Math.round((assignment.score / assignment.max_score) * 100)}%)
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <Divider />
      
      <CardActions>
        <Button 
          variant="contained" 
          startIcon={isCompleted ? <AssignmentIcon /> : <UploadIcon />}
          color={isCompleted ? "secondary" : "primary"}
          size="small"
          fullWidth
        >
          {isCompleted ? "View Submission" : "Submit Assignment"}
        </Button>
      </CardActions>
    </Card>
  );
};

const StudentAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getAssignments = async () => {
      try {
        const data = await fetchStudentAssignments();
        setAssignments(data);
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    getAssignments();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (assignments.length === 0) {
    return (
      <Alert severity="info">
        You don't have any assignments yet.
      </Alert>
    );
  }

  // Group assignments
  const pendingAssignments = assignments.filter(a => a.status !== 'Completed');
  const completedAssignments = assignments.filter(a => a.status === 'Completed');

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        My Assignments
      </Typography>
      
      {pendingAssignments.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Pending Assignments
          </Typography>
          <Grid container spacing={3}>
            {pendingAssignments.map((assignment) => (
              <Grid item xs={12} sm={6} md={4} key={assignment.id}>
                <AssignmentCard assignment={assignment} />
              </Grid>
            ))}
          </Grid>
        </>
      )}
      
      {completedAssignments.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Completed Assignments
          </Typography>
          <Grid container spacing={3}>
            {completedAssignments.map((assignment) => (
              <Grid item xs={12} sm={6} md={4} key={assignment.id}>
                <AssignmentCard assignment={assignment} />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default StudentAssignments; 