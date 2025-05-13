import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Slider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Snackbar,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardHeader,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar
} from '@mui/material';
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  AssessmentOutlined as AssessmentIcon,
  SchoolOutlined as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as PsychologyIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { 
  createStudentProgress, 
  updateStudentProgress, 
  getStudentPerformance,
  fetchStudentProgress
} from '../../services/api';

// Performance metrics definitions with tooltips and descriptions
const PERFORMANCE_METRICS = {
  attendance: {
    label: 'Attendance',
    description: 'Rate the student\'s attendance and punctuality',
    icon: <SchoolIcon />,
    tooltip: 'Consider attendance record, punctuality to sessions, and consistency',
    color: 'success'
  },
  performance: {
    label: 'Academic Performance',
    description: 'Evaluate the student\'s overall academic performance',
    icon: <AssessmentIcon />,
    tooltip: 'Consider test scores, assignment completion quality, and comprehension levels',
    color: 'primary'
  },
  concentration: {
    label: 'Focus & Engagement',
    description: 'Assess the student\'s ability to focus and engage during lessons',
    icon: <PsychologyIcon />,
    tooltip: 'Consider participation, attention span, and engagement in class discussions',
    color: 'secondary'
  }
};

// Subject areas to rate
const SUBJECT_AREAS = [
  'Mathematics',
  'Science',
  'Language Arts',
  'Social Studies',
  'Foreign Language',
  'Computer Science',
  'Arts',
  'Physical Education'
];

const StudentPerformanceForm = ({ 
  studentId, 
  studentName,
  onSubmitSuccess,
  onCancel,
  existingProgressId = null
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(existingProgressId !== null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    attendance: 80,
    performance: 75,
    concentration: 75,
    comments: '',
    strengths: [],
    areas_for_improvement: [],
    subject_ratings: {}, // Will hold ratings for each subject
    recommendations: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [studentPerformanceData, setStudentPerformanceData] = useState(null);
  
  // Add a new strength field
  const [newStrength, setNewStrength] = useState('');
  
  // Add a new improvement area field
  const [newImprovement, setNewImprovement] = useState('');
  
  // Fetch existing data if editing
  useEffect(() => {
    const fetchData = async () => {
      if (existingProgressId) {
        try {
          setInitialLoading(true);
          // Get the existing progress record
          const progressData = await fetchStudentProgress(studentId);
          const existingProgress = progressData.find(p => p.id === existingProgressId);
          
          if (existingProgress) {
            // Convert and populate form
            setFormData({
              attendance: existingProgress.attendance || 0,
              performance: existingProgress.peformance || 0, // Note: typo in the model field name
              concentration: existingProgress.concentration || 0,
              comments: existingProgress.comments || '',
              strengths: existingProgress.strengths || [],
              areas_for_improvement: existingProgress.areas_for_improvement || [],
              subject_ratings: existingProgress.subject_ratings || {},
              recommendations: existingProgress.recommendations || ''
            });
          } else {
            setError('Progress record not found');
          }
        } catch (err) {
          console.error('Error loading existing progress:', err);
          setError('Failed to load existing progress data');
        } finally {
          setInitialLoading(false);
        }
      }
      
      // Also fetch student performance data for context
      try {
        const performanceData = await getStudentPerformance(studentId);
        if (performanceData) {
          setStudentPerformanceData(performanceData);
        }
      } catch (err) {
        console.warn('Could not load student performance data:', err);
        // Don't set error - this is supplementary data
      }
    };
    
    fetchData();
  }, [studentId, existingProgressId]);
  
  // Handle metric slider changes
  const handleMetricChange = (event, newValue, metricName) => {
    setFormData(prev => ({
      ...prev,
      [metricName]: newValue
    }));
  };
  
  // Handle text field changes
  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle subject rating changes
  const handleSubjectRatingChange = (subject, value) => {
    setFormData(prev => ({
      ...prev,
      subject_ratings: {
        ...prev.subject_ratings,
        [subject]: value
      }
    }));
  };
  
  // Add a new strength
  const handleAddStrength = () => {
    if (newStrength.trim() === '') return;
    
    setFormData(prev => ({
      ...prev,
      strengths: [...prev.strengths, newStrength.trim()]
    }));
    
    setNewStrength('');
  };
  
  // Remove a strength
  const handleRemoveStrength = (index) => {
    setFormData(prev => ({
      ...prev,
      strengths: prev.strengths.filter((_, i) => i !== index)
    }));
  };
  
  // Add an improvement area
  const handleAddImprovement = () => {
    if (newImprovement.trim() === '') return;
    
    setFormData(prev => ({
      ...prev,
      areas_for_improvement: [...prev.areas_for_improvement, newImprovement.trim()]
    }));
    
    setNewImprovement('');
  };
  
  // Remove an improvement area
  const handleRemoveImprovement = (index) => {
    setFormData(prev => ({
      ...prev,
      areas_for_improvement: prev.areas_for_improvement.filter((_, i) => i !== index)
    }));
  };
  
  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (formData.comments.trim() === '') {
      errors.comments = 'Please provide some comments about the student\'s progress';
    }
    
    // Validate metrics are within range (0-100)
    Object.entries(PERFORMANCE_METRICS).forEach(([key]) => {
      if (formData[key] < 0 || formData[key] > 100) {
        errors[key] = 'Value must be between 0 and 100';
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Submit form handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSnackbarOpen(true);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Prepare data for API
      const progressData = {
        student_ids: studentId,
        attendance: formData.attendance,
        // Correct the field name to match the API 
        peformance: formData.performance, // Note the typo in the model field
        concentration: formData.concentration,
        comments: formData.comments,
        // Store additional data as JSON in the comments field if API doesn't support these directly
        additional_data: JSON.stringify({
          strengths: formData.strengths,
          areas_for_improvement: formData.areas_for_improvement,
          subject_ratings: formData.subject_ratings,
          recommendations: formData.recommendations
        })
      };
      
      let result;
      if (existingProgressId) {
        // Update existing record
        result = await updateStudentProgress(existingProgressId, progressData);
      } else {
        // Create new record
        result = await createStudentProgress(progressData);
      }
      
      setSuccess(true);
      setSnackbarOpen(true);
      
      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess(result);
      }
    } catch (err) {
      console.error('Error submitting student progress:', err);
      setError(err.message || 'Failed to save progress record. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  // Generate mark descriptions based on the score
  const getMarkDescription = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Satisfactory';
    if (score >= 50) return 'Needs Improvement';
    return 'Unsatisfactory';
  };
  
  if (initialLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper elevation={2} sx={{ p: 3, maxWidth: 1000, mx: 'auto', mb: 4 }}>
      <Box mb={3}>
        <Typography variant="h5" component="h2" gutterBottom>
          {existingProgressId ? 'Update' : 'New'} Student Assessment
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          {studentName || `Student ID: ${studentId}`}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Student assessment has been successfully {existingProgressId ? 'updated' : 'created'}.
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={4}>
          {/* Student Performance Context (if available) */}
          {studentPerformanceData && (
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="performance-context-content"
                  id="performance-context-header"
                >
                  <Box display="flex" alignItems="center">
                    <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Current Performance Overview</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {studentPerformanceData.assignments && studentPerformanceData.assignments.length > 0 ? (
                      <>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Recent Assignment Scores
                          </Typography>
                          <Box sx={{ overflowX: 'auto' }}>
                            <Box component="table" sx={{ minWidth: 500, width: '100%', borderCollapse: 'collapse' }}>
                              <Box component="thead">
                                <Box component="tr" sx={{ borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
                                  <Box component="th" sx={{ p: 1, textAlign: 'left' }}>Assignment</Box>
                                  <Box component="th" sx={{ p: 1, textAlign: 'left' }}>Subject</Box>
                                  <Box component="th" sx={{ p: 1, textAlign: 'right' }}>Score</Box>
                                  <Box component="th" sx={{ p: 1, textAlign: 'left' }}>Status</Box>
                                </Box>
                              </Box>
                              <Box component="tbody">
                                {studentPerformanceData.assignments.slice(0, 5).map((assignment, index) => (
                                  <Box component="tr" key={index} sx={{ 
                                    borderBottom: '1px solid rgba(0,0,0,0.08)',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } 
                                  }}>
                                    <Box component="td" sx={{ p: 1 }}>{assignment.title}</Box>
                                    <Box component="td" sx={{ p: 1 }}>{assignment.subject || 'General'}</Box>
                                    <Box component="td" sx={{ p: 1, textAlign: 'right' }}>
                                      {assignment.percentage ? (
                                        <Chip 
                                          size="small" 
                                          label={`${Math.round(assignment.percentage)}%`}
                                          color={assignment.percentage >= 70 ? 'success' : assignment.percentage >= 50 ? 'warning' : 'error'}
                                        />
                                      ) : (
                                        assignment.status === 'Completed' ? 'Graded' : assignment.status
                                      )}
                                    </Box>
                                    <Box component="td" sx={{ p: 1 }}>{assignment.status}</Box>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          </Box>
                        </Grid>
                        
                        {studentPerformanceData.strengths_weaknesses && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                              Current Strengths & Weaknesses
                            </Typography>
                            <Box mt={1}>
                              <Typography variant="body2" fontWeight="medium">Strengths:</Typography>
                              {studentPerformanceData.strengths_weaknesses.strengths?.length > 0 ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {studentPerformanceData.strengths_weaknesses.strengths.map((item, index) => (
                                    <Chip 
                                      key={index} 
                                      label={`${item.subject}: ${item.score}%`} 
                                      color="success" 
                                      size="small"
                                      variant="outlined"
                                      sx={{ my: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">No strengths identified yet</Typography>
                              )}
                            </Box>
                            <Box mt={2}>
                              <Typography variant="body2" fontWeight="medium">Areas for Improvement:</Typography>
                              {studentPerformanceData.strengths_weaknesses.weaknesses?.length > 0 ? (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {studentPerformanceData.strengths_weaknesses.weaknesses.map((item, index) => (
                                    <Chip 
                                      key={index} 
                                      label={`${item.subject}: ${item.score}%`} 
                                      color="error" 
                                      size="small"
                                      variant="outlined"
                                      sx={{ my: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">No areas for improvement identified yet</Typography>
                              )}
                            </Box>
                          </Grid>
                        )}
                        
                        {studentPerformanceData.recommendations && (
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                              Current Recommendations
                            </Typography>
                            {studentPerformanceData.recommendations?.length > 0 ? (
                              <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                                {studentPerformanceData.recommendations.map((rec, index) => (
                                  <Box component="li" key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">{rec.message}</Typography>
                                  </Box>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">No recommendations available</Typography>
                            )}
                          </Grid>
                        )}
                      </>
                    ) : (
                      <Grid item xs={12}>
                        <Alert severity="info">
                          No previous performance data available for this student.
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
        
          {/* Core Performance Metrics */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Assess the student's overall performance in the following key areas:
            </Typography>
            
            <Grid container spacing={3}>
              {Object.entries(PERFORMANCE_METRICS).map(([key, metric]) => (
                <Grid item xs={12} md={4} key={key}>
                  <Card variant="outlined">
                    <CardHeader
                      avatar={
                        <Avatar sx={{ bgcolor: `${metric.color}.light`, color: `${metric.color}.main` }}>
                          {metric.icon}
                        </Avatar>
                      }
                      title={metric.label}
                      titleTypographyProps={{ variant: 'subtitle1' }}
                      action={
                        <Tooltip title={metric.tooltip}>
                          <IconButton size="small">
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      }
                    />
                    <CardContent>
                      <Typography color="textSecondary" variant="body2" gutterBottom>
                        {metric.description}
                      </Typography>
                      
                      <Box mt={2}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs>
                            <Slider
                              value={formData[key]}
                              onChange={(e, newValue) => handleMetricChange(e, newValue, key)}
                              aria-labelledby={`${key}-slider`}
                              valueLabelDisplay="auto"
                              step={5}
                              marks
                              min={0}
                              max={100}
                              color={metric.color}
                            />
                          </Grid>
                          <Grid item>
                            <Typography variant="body2">
                              {formData[key]}%
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Box mt={1} textAlign="center">
                          <Chip 
                            label={getMarkDescription(formData[key])} 
                            size="small"
                            color={
                              formData[key] >= 80 ? 'success' : 
                              formData[key] >= 60 ? 'primary' :
                              formData[key] >= 40 ? 'warning' : 'error'
                            }
                          />
                        </Box>
                      </Box>
                      
                      {formErrors[key] && (
                        <FormHelperText error>{formErrors[key]}</FormHelperText>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
          
          {/* Subject-specific ratings */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="subject-ratings-content"
                id="subject-ratings-header"
              >
                <Typography variant="h6">Subject-Specific Ratings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Rate the student's proficiency in each subject area:
                </Typography>
                
                <Grid container spacing={3}>
                  {SUBJECT_AREAS.map((subject) => (
                    <Grid item xs={12} sm={6} md={4} key={subject}>
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          {subject}
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs>
                            <Slider
                              value={formData.subject_ratings[subject] || 50}
                              onChange={(e, newValue) => handleSubjectRatingChange(subject, newValue)}
                              aria-labelledby={`${subject}-slider`}
                              valueLabelDisplay="auto"
                              step={5}
                              marks
                              min={0}
                              max={100}
                            />
                          </Grid>
                          <Grid item>
                            <Typography variant="body2">
                              {formData.subject_ratings[subject] || 50}%
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
          
          {/* Strengths and Areas for Improvement */}
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" gutterBottom>
              Student Strengths
            </Typography>
            <Box display="flex" mb={2}>
              <TextField
                fullWidth
                label="Add a strength"
                value={newStrength}
                onChange={(e) => setNewStrength(e.target.value)}
                placeholder="e.g., Critical thinking"
                size="small"
              />
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleAddStrength}
                disabled={!newStrength.trim()}
                sx={{ ml: 1 }}
              >
                Add
              </Button>
            </Box>
            
            <Box mt={2} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.strengths.length > 0 ? (
                formData.strengths.map((strength, index) => (
                  <Chip
                    key={index}
                    label={strength}
                    onDelete={() => handleRemoveStrength(index)}
                    color="success"
                    sx={{ margin: 0.5 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No strengths added yet. Use the field above to add student's strengths.
                </Typography>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" gutterBottom>
              Areas for Improvement
            </Typography>
            <Box display="flex" mb={2}>
              <TextField
                fullWidth
                label="Add an area for improvement"
                value={newImprovement}
                onChange={(e) => setNewImprovement(e.target.value)}
                placeholder="e.g., Time management"
                size="small"
              />
              <Button 
                variant="contained" 
                color="secondary"
                onClick={handleAddImprovement}
                disabled={!newImprovement.trim()}
                sx={{ ml: 1 }}
              >
                Add
              </Button>
            </Box>
            
            <Box mt={2} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.areas_for_improvement.length > 0 ? (
                formData.areas_for_improvement.map((area, index) => (
                  <Chip
                    key={index}
                    label={area}
                    onDelete={() => handleRemoveImprovement(index)}
                    color="warning"
                    sx={{ margin: 0.5 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No areas for improvement added yet. Use the field above to add areas that need improvement.
                </Typography>
              )}
            </Box>
          </Grid>
          
          {/* Comments and Recommendations */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Progress Comments"
              name="comments"
              value={formData.comments}
              onChange={handleTextChange}
              placeholder="Provide detailed comments about the student's progress, achievements, and challenges..."
              error={!!formErrors.comments}
              helperText={formErrors.comments}
              required
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Recommendations"
              name="recommendations"
              value={formData.recommendations}
              onChange={handleTextChange}
              placeholder="Provide specific recommendations for the student's continued growth and development..."
            />
          </Grid>
          
          {/* Form Actions */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" mt={2}>
              {onCancel && (
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled={loading}
              >
                {loading ? 'Saving...' : (existingProgressId ? 'Update Assessment' : 'Save Assessment')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={error ? error : "Assessment saved successfully"}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleCloseSnackbar}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Paper>
  );
};

export default StudentPerformanceForm; 