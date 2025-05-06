import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  IconButton,
  Divider,
  Tooltip,
  Link
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Grading as GradingIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { getAssignmentDetails, getAssignmentSubmissions, gradeSubmission } from '../../services/api';
import { format } from 'date-fns';

const SubmissionReviewDialog = ({ assignmentId, onClose }) => {
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openGradeDialog, setOpenGradeDialog] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState(null);
  const [gradeData, setGradeData] = useState({ points: '', feedback: '' });
  const [submitting, setSubmitting] = useState(false);
  const [gradeError, setGradeError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Fetch assignment and submissions when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assignmentData, submissionsData] = await Promise.all([
          getAssignmentDetails(assignmentId),
          getAssignmentSubmissions(assignmentId)
        ]);
        setAssignment(assignmentData);
        setSubmissions(submissionsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load assignment submissions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (assignmentId) {
      fetchData();
    }
  }, [assignmentId]);

  const handleOpenGradeDialog = (submission) => {
    setCurrentSubmission(submission);
    
    // If already graded, pre-populate the form
    if (submission.grade_info) {
      setGradeData({
        points: submission.grade_info.points,
        feedback: submission.grade_info.feedback || ''
      });
    } else {
      setGradeData({ points: '', feedback: '' });
    }
    
    setOpenGradeDialog(true);
  };

  const handleCloseGradeDialog = () => {
    setOpenGradeDialog(false);
    setCurrentSubmission(null);
    setGradeData({ points: '', feedback: '' });
    setGradeError(null);
  };

  const handleGradeChange = (e) => {
    const { name, value } = e.target;
    setGradeData(prev => ({ ...prev, [name]: value }));
  };

  const validateGradeData = () => {
    const errors = {};
    
    if (!gradeData.points || isNaN(gradeData.points)) {
      errors.points = 'Please enter a valid number';
    } else if (parseFloat(gradeData.points) < 0) {
      errors.points = 'Points cannot be negative';
    } else if (assignment && parseFloat(gradeData.points) > assignment.max_score) {
      errors.points = `Points cannot exceed the maximum score of ${assignment.max_score}`;
    }
    
    setGradeError(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitGrade = async () => {
    if (!validateGradeData()) {
      return;
    }
    
    setSubmitting(true);
    try {
      await gradeSubmission(currentSubmission.id, {
        points: parseFloat(gradeData.points),
        feedback: gradeData.feedback
      });
      
      // Update the local submissions data
      const updatedSubmissions = submissions.map(sub => {
        if (sub.id === currentSubmission.id) {
          return {
            ...sub,
            status: 'Graded',
            grade_info: {
              points: parseFloat(gradeData.points),
              feedback: gradeData.feedback,
              graded_at: new Date().toISOString()
            }
          };
        }
        return sub;
      });
      
      setSubmissions(updatedSubmissions);
      setSuccess(true);
      
      // Close dialog after a short delay
      setTimeout(() => {
        handleCloseGradeDialog();
        setSuccess(false);
      }, 1500);
      
    } catch (err) {
      console.error('Error submitting grade:', err);
      setGradeError({ general: 'Failed to submit grade. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case 'Submitted':
        return <Chip size="small" color="primary" label="Submitted" />;
      case 'Late':
        return <Chip size="small" color="warning" icon={<ScheduleIcon />} label="Late" />;
      case 'Graded':
        return <Chip size="small" color="success" icon={<CheckCircleIcon />} label="Graded" />;
      default:
        return <Chip size="small" label={status} />;
    }
  };

  const calculateScore = (submission) => {
    if (!submission.grade_info) return 'Not graded';
    
    const points = submission.grade_info.points;
    const maxScore = assignment ? assignment.max_score : 100;
    const percentage = (points / maxScore) * 100;
    
    return `${points}/${maxScore} (${percentage.toFixed(1)}%)`;
  };

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

  return (
    <Box>
      {assignment && (
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>
            {assignment.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            <strong>Due date:</strong> {assignment.due_date ? format(new Date(assignment.due_date), 'MMM d, yyyy • h:mm a') : 'No due date'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            <strong>Max score:</strong> {assignment.max_score} points
          </Typography>
          {assignment.file && (
            <Button 
              startIcon={<DownloadIcon />} 
              variant="outlined" 
              size="small"
              href={assignment.file}
              target="_blank"
              sx={{ mt: 1 }}
            >
              Download Assignment
            </Button>
          )}
        </Box>
      )}

      {submissions.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Student</strong></TableCell>
                <TableCell><strong>Submitted</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Files</strong></TableCell>
                <TableCell><strong>Score</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>{submission.student_name}</TableCell>
                  <TableCell>
                    {format(new Date(submission.submitted_at), 'MMM d, yyyy • h:mm a')}
                  </TableCell>
                  <TableCell>{getStatusChip(submission.status)}</TableCell>
                  <TableCell>
                    {submission.submission_file ? (
                      <Link 
                        href={submission.submission_file} 
                        target="_blank"
                        download
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        <DownloadIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Download
                      </Link>
                    ) : 'No file'}
                  </TableCell>
                  <TableCell>{calculateScore(submission)}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      color={submission.status === 'Graded' ? 'secondary' : 'primary'}
                      size="small"
                      startIcon={<GradingIcon />}
                      onClick={() => handleOpenGradeDialog(submission)}
                    >
                      {submission.status === 'Graded' ? 'Edit Grade' : 'Grade'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">
          No submissions found for this assignment yet.
        </Alert>
      )}

      {/* Grading Dialog */}
      <Dialog open={openGradeDialog} onClose={handleCloseGradeDialog} maxWidth="md">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {currentSubmission?.status === 'Graded' ? 'Edit Grade' : 'Grade Submission'}
            </Typography>
            <IconButton size="small" onClick={handleCloseGradeDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Grade submitted successfully!
            </Alert>
          )}
          
          {gradeError?.general && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {gradeError.general}
            </Alert>
          )}
          
          {currentSubmission && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1">
                  <strong>Student:</strong> {currentSubmission.student_name}
                </Typography>
                <Typography variant="subtitle1">
                  <strong>Submitted:</strong> {format(new Date(currentSubmission.submitted_at), 'MMM d, yyyy • h:mm a')}
                </Typography>
                <Typography variant="subtitle1">
                  <strong>Status:</strong> {getStatusChip(currentSubmission.status)}
                </Typography>
              </Grid>
              
              {currentSubmission.submission_text && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Submission Text:</strong>
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, maxHeight: '200px', overflow: 'auto' }}>
                    <Typography variant="body2" whiteSpace="pre-wrap">
                      {currentSubmission.submission_text}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="points"
                  label={`Points (out of ${assignment?.max_score || 100})`}
                  type="number"
                  fullWidth
                  value={gradeData.points}
                  onChange={handleGradeChange}
                  error={Boolean(gradeError?.points)}
                  helperText={gradeError?.points}
                  InputProps={{ inputProps: { min: 0, max: assignment?.max_score || 100 } }}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="feedback"
                  label="Feedback (optional)"
                  multiline
                  rows={4}
                  fullWidth
                  value={gradeData.feedback}
                  onChange={handleGradeChange}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGradeDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitGrade}
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {submitting ? 'Submitting...' : 'Submit Grade'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubmissionReviewDialog; 