import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Chip,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { fetchStudentSummary, fetchStudentProgress, createStudentProgress } from '../services/api';
import StudentPerformanceForm from '../components/student/StudentPerformanceForm';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Tab panel component for tab content
const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-performance-tabpanel-${index}`}
      aria-labelledby={`student-performance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
};

const StudentPerformanceAssessment = () => {
  const navigate = useNavigate();
  // State for student list
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // State for progress records
  const [progressRecords, setProgressRecords] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  
  // State for searching and filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // State for new assessment form dialog
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState('new'); // 'new' or 'edit'
  const [selectedProgressId, setSelectedProgressId] = useState(null);
  
  // State for tab selection
  const [tabValue, setTabValue] = useState(0);
  
  // State for errors
  const [error, setError] = useState(null);
  
  // Fetch student list when component mounts
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const studentData = await fetchStudentSummary();
        setStudents(studentData);
        setFilteredStudents(studentData);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load student list. Please try again.');
      } finally {
        setLoadingStudents(false);
      }
    };
    
    fetchStudents();
  }, []);
  
  // Filter students when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = students.filter(student => 
      student.first_name.toLowerCase().includes(lowerQuery) ||
      student.last_name.toLowerCase().includes(lowerQuery) ||
      student.email.toLowerCase().includes(lowerQuery)
    );
    
    setFilteredStudents(filtered);
  }, [searchQuery, students]);
  
  // Fetch progress records when a student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setProgressRecords([]);
      return;
    }
    
    const fetchProgress = async () => {
      try {
        setLoadingProgress(true);
        const progressData = await fetchStudentProgress(selectedStudent.id);
        setProgressRecords(progressData);
      } catch (err) {
        console.error(`Error fetching progress for student ${selectedStudent.id}:`, err);
        setError('Failed to load progress records. Please try again.');
      } finally {
        setLoadingProgress(false);
      }
    };
    
    fetchProgress();
  }, [selectedStudent]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle student selection
  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setTabValue(0); // Switch to summary tab
  };
  
  // Handle search query change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Open form dialog for new assessment
  const handleNewAssessment = () => {
    setFormMode('new');
    setSelectedProgressId(null);
    setFormDialogOpen(true);
  };
  
  // Open form dialog for editing assessment
  const handleEditAssessment = (progressId) => {
    setFormMode('edit');
    setSelectedProgressId(progressId);
    setFormDialogOpen(true);
  };
  
  // Handle form submission success
  const handleFormSubmitSuccess = (result) => {
    // Refresh progress records
    if (selectedStudent) {
      fetchStudentProgress(selectedStudent.id)
        .then(progressData => {
          setProgressRecords(progressData);
        })
        .catch(err => {
          console.error(`Error refreshing progress for student ${selectedStudent.id}:`, err);
        });
    }
    
    // Close form dialog
    setFormDialogOpen(false);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };
  
  // Determine score category
  const getScoreCategory = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'success' };
    if (score >= 80) return { label: 'Very Good', color: 'success' };
    if (score >= 70) return { label: 'Good', color: 'primary' };
    if (score >= 60) return { label: 'Satisfactory', color: 'primary' };
    if (score >= 50) return { label: 'Needs Improvement', color: 'warning' };
    return { label: 'Unsatisfactory', color: 'error' };
  };
  
  return (
    <Container maxWidth="xl">
      <Box py={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Student Performance Assessment
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Box>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Assess and track student performance, provide feedback, and generate personalized recommendations.
        </Typography>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => setError(null)}>
                Dismiss
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        
        <Grid container spacing={4}>
          {/* Student Selection Panel */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Select a Student
              </Typography>
              
              <Box display="flex" mb={2}>
                <TextField
                  fullWidth
                  placeholder="Search students..."
                  variant="outlined"
                  size="small"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  }}
                />
              </Box>
              
              {loadingStudents ? (
                <Box display="flex" justifyContent="center" my={4}>
                  <CircularProgress />
                </Box>
              ) : filteredStudents.length > 0 ? (
                <List sx={{ maxHeight: 500, overflow: 'auto' }}>
                  {filteredStudents.map(student => (
                    <ListItem
                      key={student.id}
                      button
                      selected={selectedStudent?.id === student.id}
                      onClick={() => handleStudentSelect(student)}
                      divider
                    >
                      <ListItemText
                        primary={`${student.first_name} ${student.last_name}`}
                        secondary={student.email}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography color="textSecondary">
                    No students found matching your search.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Student Detail and Performance Panel */}
          <Grid item xs={12} md={8}>
            {selectedStudent ? (
              <Paper elevation={2} sx={{ p: 0 }}>
                {/* Student header */}
                <Box p={3} bgcolor="primary.light">
                  <Grid container spacing={2} alignItems="center">
                    <Grid item>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {selectedStudent.first_name.charAt(0)}
                        {selectedStudent.last_name.charAt(0)}
                      </Box>
                    </Grid>
                    <Grid item xs>
                      <Typography variant="h5" component="h2" color="primary.contrastText">
                        {selectedStudent.first_name} {selectedStudent.last_name}
                      </Typography>
                      <Typography variant="body1" color="primary.contrastText">
                        {selectedStudent.email}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={handleNewAssessment}
                      >
                        New Assessment
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
                
                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    aria-label="student performance tabs"
                  >
                    <Tab label="Assessment History" />
                    <Tab label="Performance Summary" />
                  </Tabs>
                </Box>
                
                {/* Assessment History Tab */}
                <TabPanel value={tabValue} index={0}>
                  {loadingProgress ? (
                    <Box display="flex" justifyContent="center" my={4}>
                      <CircularProgress />
                    </Box>
                  ) : progressRecords.length > 0 ? (
                    <>
                      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1">
                          Assessment History
                        </Typography>
                        <Button
                          startIcon={<RefreshIcon />}
                          onClick={() => {
                            setLoadingProgress(true);
                            fetchStudentProgress(selectedStudent.id)
                              .then(progressData => {
                                setProgressRecords(progressData);
                                setLoadingProgress(false);
                              })
                              .catch(err => {
                                console.error(`Error refreshing progress:`, err);
                                setLoadingProgress(false);
                              });
                          }}
                        >
                          Refresh
                        </Button>
                      </Box>
                      
                      <TableContainer>
                        <Table aria-label="assessment history table">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell align="center">Attendance</TableCell>
                              <TableCell align="center">Performance</TableCell>
                              <TableCell align="center">Concentration</TableCell>
                              <TableCell>Comments</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {progressRecords.map((record) => {
                              const performanceCategory = getScoreCategory(record.peformance);
                              return (
                                <TableRow key={record.id} hover>
                                  <TableCell>
                                    {formatDate(record.created_at)}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      size="small" 
                                      label={`${record.attendance}%`}
                                      color={record.attendance >= 80 ? 'success' : record.attendance >= 60 ? 'primary' : 'warning'}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      size="small" 
                                      label={`${record.peformance}%`}
                                      color={performanceCategory.color}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      size="small" 
                                      label={`${record.concentration}%`}
                                      color={record.concentration >= 80 ? 'success' : record.concentration >= 60 ? 'primary' : 'warning'}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip title={record.comments}>
                                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                        {record.comments}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton 
                                      size="small" 
                                      color="primary"
                                      onClick={() => handleEditAssessment(record.id)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Box textAlign="center" py={4}>
                      <AssessmentIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        No Assessments Yet
                      </Typography>
                      <Typography color="textSecondary" paragraph>
                        Create your first assessment for this student by clicking the "New Assessment" button.
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleNewAssessment}
                      >
                        New Assessment
                      </Button>
                    </Box>
                  )}
                </TabPanel>
                
                {/* Performance Summary Tab */}
                <TabPanel value={tabValue} index={1}>
                  {loadingProgress ? (
                    <Box display="flex" justifyContent="center" my={4}>
                      <CircularProgress />
                    </Box>
                  ) : progressRecords.length > 0 ? (
                    <Grid container spacing={3}>
                      {/* Performance Metrics Summary */}
                      <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                          Performance Metrics Summary
                        </Typography>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <Paper
                              variant="outlined"
                              sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}
                            >
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Average Attendance
                              </Typography>
                              <Typography variant="h4" color="success.dark">
                                {Math.round(
                                  progressRecords.reduce((sum, record) => sum + record.attendance, 0) / 
                                  progressRecords.length
                                )}%
                              </Typography>
                            </Paper>
                          </Grid>
                          
                          <Grid item xs={12} sm={4}>
                            <Paper
                              variant="outlined"
                              sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}
                            >
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Average Performance
                              </Typography>
                              <Typography variant="h4" color="primary.dark">
                                {Math.round(
                                  progressRecords.reduce((sum, record) => sum + record.peformance, 0) / 
                                  progressRecords.length
                                )}%
                              </Typography>
                            </Paper>
                          </Grid>
                          
                          <Grid item xs={12} sm={4}>
                            <Paper
                              variant="outlined"
                              sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light' }}
                            >
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Average Concentration
                              </Typography>
                              <Typography variant="h4" color="secondary.dark">
                                {Math.round(
                                  progressRecords.reduce((sum, record) => sum + record.concentration, 0) / 
                                  progressRecords.length
                                )}%
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Grid>
                      
                      {/* Progress Trend */}
                      <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                          Progress Trend
                        </Typography>
                        
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell align="right">Attendance</TableCell>
                                <TableCell align="right">Performance</TableCell>
                                <TableCell align="right">Concentration</TableCell>
                                <TableCell align="right">Overall</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {progressRecords.map((record) => {
                                const overall = Math.round(
                                  (record.attendance + record.peformance + record.concentration) / 3
                                );
                                const category = getScoreCategory(overall);
                                
                                return (
                                  <TableRow key={record.id} hover>
                                    <TableCell>{formatDate(record.created_at)}</TableCell>
                                    <TableCell align="right">{record.attendance}%</TableCell>
                                    <TableCell align="right">{record.peformance}%</TableCell>
                                    <TableCell align="right">{record.concentration}%</TableCell>
                                    <TableCell align="right">
                                      <Chip 
                                        size="small" 
                                        label={`${overall}% - ${category.label}`}
                                        color={category.color}
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Grid>
                      
                      {/* Latest Comments */}
                      <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>
                          Latest Assessment Comments
                        </Typography>
                        
                        <Paper variant="outlined" sx={{ p: 3 }}>
                          <Typography variant="body1" paragraph>
                            {progressRecords[0]?.comments || 'No comments available'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Last updated: {formatDate(progressRecords[0]?.created_at)}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  ) : (
                    <Box textAlign="center" py={4}>
                      <AssessmentIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        No Performance Data
                      </Typography>
                      <Typography color="textSecondary" paragraph>
                        There is no performance data available for this student yet.
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleNewAssessment}
                      >
                        Create First Assessment
                      </Button>
                    </Box>
                  )}
                </TabPanel>
              </Paper>
            ) : (
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 4, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AssessmentIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Student Selected
                </Typography>
                <Typography color="textSecondary" align="center">
                  Select a student from the list to view or create performance assessments.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Box>
      
      {/* Assessment Form Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        scroll="paper"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {formMode === 'new' ? 'New Assessment' : 'Edit Assessment'}
            </Typography>
            <IconButton onClick={() => setFormDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedStudent && (
            <StudentPerformanceForm
              studentId={selectedStudent.id}
              studentName={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
              onSubmitSuccess={handleFormSubmitSuccess}
              onCancel={() => setFormDialogOpen(false)}
              existingProgressId={formMode === 'edit' ? selectedProgressId : null}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default StudentPerformanceAssessment; 