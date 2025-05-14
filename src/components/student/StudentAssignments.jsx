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
  Grade as GradeIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { getAssignments } from '../../services/api';

const AssignmentCard = ({ assignment }) => {
  const isPastDue = new Date(assignment.due_date) < new Date();
  const isGraded = assignment.status === 'Graded' || assignment.feedback_received;
  const isSubmitted = assignment.submitted || assignment.status === 'Submitted' || assignment.status === 'Late';
  
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
        borderLeft: isGraded ? '5px solid #4caf50' : isPastDue ? '5px solid #f44336' : '5px solid #2196f3'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="div">
            {assignment.title}
          </Typography>
          {isGraded ? (
            <Chip 
              icon={<GradeIcon />} 
              label="Graded" 
              color="success" 
              size="small" 
            />
          ) : isSubmitted ? (
            <Chip 
              icon={<AssignmentIcon />} 
              label="Submitted" 
              color="primary" 
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
        
        {isGraded && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GradeIcon fontSize="small" color="primary" />
              <strong>Grade:</strong> {assignment.score || 0}/{assignment.max_score} 
              ({Math.round(((assignment.score || 0) / assignment.max_score) * 100)}%)
            </Typography>
            {assignment.feedback && (
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                <strong>Feedback:</strong> {assignment.feedback}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
      
      <Divider />
      
      <CardActions>
        <Button 
          variant="contained" 
          startIcon={isSubmitted ? <AssignmentIcon /> : <UploadIcon />}
          color={isSubmitted ? "secondary" : "primary"}
          size="small"
          fullWidth
        >
          {isSubmitted ? "View Submission" : "Submit Assignment"}
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
    const fetchAssignments = async () => {
      try {
        const response = await getAssignments();
        // Transform the response data to include grade information
        const transformedAssignments = response.data.map(assignment => {
          // Check if there's a submission with a grade
          const submission = assignment.submissions?.find(sub => sub.student === user.id);
          const grade = submission?.grade_info;
          
          return {
            ...assignment,
            status: grade ? 'Graded' : assignment.status,
            feedback_received: !!grade,
            score: grade?.points || 0,
            max_score: assignment.max_score || 100,
            feedback: grade?.feedback || null
          };
        });
        
        setAssignments(transformedAssignments);
      } catch (err) {
        console.error('Error fetching assignments:', err);
        setError('Failed to load assignments. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user.id]);

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
  const pendingAssignments = assignments.filter(a => !a.feedback_received && !a.status?.includes('Graded'));
  const gradedAssignments = assignments.filter(a => a.feedback_received || a.status?.includes('Graded'));

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
      
      {gradedAssignments.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Graded Assignments
          </Typography>
          <Grid container spacing={3}>
            {gradedAssignments.map((assignment) => (
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