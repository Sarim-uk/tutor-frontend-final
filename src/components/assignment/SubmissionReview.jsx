import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Avatar,
  TextField,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Stack,
  Menu,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  Grade as GradeIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getAssignmentDetails, 
  getSubmissions, 
  gradeSubmission, 
  downloadSubmissionFile 
} from '../../services/api';

const SubmissionReview = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'student_name', direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState('all');
  
  // State for grading dialog
  const [gradingDialog, setGradingDialog] = useState({
    open: false,
    submissionId: null,
    studentName: '',
    currentScore: 0,
    newScore: 0,
    feedback: '',
    submitting: false,
    error: null
  });
  
  // State for menu
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
  
  useEffect(() => {
    fetchAssignmentAndSubmissions();
  }, [assignmentId]);
  
  useEffect(() => {
    if (submissions.length > 0) {
      filterAndSortSubmissions();
    }
  }, [submissions, searchQuery, sortConfig, filterStatus]);
  
  const fetchAssignmentAndSubmissions = async () => {
    try {
      setLoading(true);
      const [assignmentData, submissionsData] = await Promise.all([
        getAssignmentDetails(assignmentId),
        getSubmissions(assignmentId)
      ]);
      
      setAssignment(assignmentData);
      setSubmissions(submissionsData);
      setFilteredSubmissions(submissionsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching assignment and submissions:", err);
      setError("Failed to load assignment details and submissions. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const filterAndSortSubmissions = () => {
    let result = [...submissions];
    
    // Apply filters
    if (filterStatus !== 'all') {
      if (filterStatus === 'graded') {
        result = result.filter(submission => submission.graded);
      } else if (filterStatus === 'ungraded') {
        result = result.filter(submission => !submission.graded);
      } else if (filterStatus === 'late') {
        result = result.filter(submission => submission.is_late);
      }
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        submission => submission.student_name.toLowerCase().includes(query) || 
                     submission.student_id.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredSubmissions(result);
  };
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleFilterChange = (status) => {
    setFilterStatus(status);
  };
  
  const openGradingDialog = (submission) => {
    setGradingDialog({
      open: true,
      submissionId: submission.id,
      studentName: submission.student_name,
      currentScore: submission.score || 0,
      newScore: submission.score || 0,
      feedback: submission.feedback || '',
      submitting: false,
      error: null
    });
    
    handleMenuClose();
  };
  
  const closeGradingDialog = () => {
    setGradingDialog(prev => ({
      ...prev,
      open: false
    }));
  };
  
  const handleGradeChange = (e) => {
    const { name, value } = e.target;
    setGradingDialog(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmitGrade = async () => {
    const { submissionId, newScore, feedback } = gradingDialog;
    
    // Validate score
    const score = parseInt(newScore, 10);
    if (isNaN(score) || score < 0 || score > assignment.max_score) {
      setGradingDialog(prev => ({
        ...prev,
        error: `Score must be between 0 and ${assignment.max_score}`
      }));
      return;
    }
    
    setGradingDialog(prev => ({
      ...prev,
      submitting: true,
      error: null
    }));
    
    try {
      await gradeSubmission(submissionId, {
        score,
        feedback,
        assignment_id: assignmentId
      });
      
      // Update local state
      const updatedSubmissions = submissions.map(sub => {
        if (sub.id === submissionId) {
          return {
            ...sub,
            score,
            feedback,
            graded: true,
            graded_at: new Date().toISOString()
          };
        }
        return sub;
      });
      
      setSubmissions(updatedSubmissions);
      closeGradingDialog();
    } catch (err) {
      console.error("Error submitting grade:", err);
      setGradingDialog(prev => ({
        ...prev,
        submitting: false,
        error: "Failed to submit grade. Please try again."
      }));
    }
  };
  
  const handleDownloadSubmission = async (submissionId, fileName) => {
    try {
      const response = await downloadSubmissionFile(submissionId);
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'submission-file');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      handleMenuClose();
    } catch (err) {
      console.error("Error downloading file:", err);
      setError("Failed to download submission file. Please try again.");
    }
  };
  
  const handleMenuOpen = (event, submissionId) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedSubmissionId(submissionId);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedSubmissionId(null);
  };
  
  const handleBack = () => {
    navigate('/assignments');
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Assignments
        </Button>
      </Box>
    );
  }
  
  const renderStatusChip = (submission) => {
    if (submission.graded) {
      return (
        <Chip 
          label={`Graded: ${submission.score}/${assignment.max_score}`}
          color="success"
          icon={<CheckIcon />}
          size="small"
        />
      );
    } else {
      return (
        <Chip 
          label="Not Graded"
          color="default"
          icon={<CloseIcon />}
          size="small"
        />
      );
    }
  };
  
  return (
    <Box p={3}>
      <Paper sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton 
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              Assignment Submissions
            </Typography>
            {assignment && (
              <Typography variant="subtitle1" color="textSecondary">
                {assignment.title} • {filteredSubmissions.length} submissions
              </Typography>
            )}
          </Box>
        </Box>

        {/* Assignment Summary */}
        {assignment && (
          <Card variant="outlined" sx={{ mb: 4 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Typography variant="h6" gutterBottom>
                    <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {assignment.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {assignment.description}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>Due Date:</strong> {new Date(assignment.due_date).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Maximum Score:</strong> {assignment.max_score} points
                    </Typography>
                    {assignment.file && (
                      <Box>
                        <Typography variant="body2">
                          <strong>Assignment Material:</strong>
                        </Typography>
                        <Chip 
                          icon={<DescriptionIcon />} 
                          label={assignment.file.split('/').pop()}
                          size="small"
                          variant="outlined"
                          onClick={() => {/* Handle download */}}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Box mb={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder="Search by student name or ID"
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={8}>
              <Stack direction="row" spacing={1}>
                <Button 
                  size="small" 
                  variant={filterStatus === 'all' ? 'contained' : 'outlined'}
                  onClick={() => handleFilterChange('all')}
                >
                  All
                </Button>
                <Button 
                  size="small" 
                  variant={filterStatus === 'graded' ? 'contained' : 'outlined'}
                  onClick={() => handleFilterChange('graded')}
                >
                  Graded
                </Button>
                <Button 
                  size="small" 
                  variant={filterStatus === 'ungraded' ? 'contained' : 'outlined'}
                  onClick={() => handleFilterChange('ungraded')}
                >
                  Ungraded
                </Button>
                <Button 
                  size="small" 
                  variant={filterStatus === 'late' ? 'contained' : 'outlined'}
                  onClick={() => handleFilterChange('late')}
                >
                  Late
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Submissions Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                    onClick={() => handleSort('student_name')}>
                    Student
                    {sortConfig.key === 'student_name' && (
                      <SortIcon 
                        fontSize="small" 
                        sx={{ 
                          ml: 0.5, 
                          transform: sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none'
                        }} 
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                    onClick={() => handleSort('submitted_at')}>
                    Submitted
                    {sortConfig.key === 'submitted_at' && (
                      <SortIcon 
                        fontSize="small" 
                        sx={{ 
                          ml: 0.5, 
                          transform: sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none'
                        }} 
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>Submission</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                    onClick={() => handleSort('score')}>
                    Status/Grade
                    {sortConfig.key === 'score' && (
                      <SortIcon 
                        fontSize="small" 
                        sx={{ 
                          ml: 0.5, 
                          transform: sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none'
                        }} 
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" sx={{ py: 2 }}>
                      No submissions found. Adjust your search or filter criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ width: 32, height: 32, mr: 1 }}
                          alt={submission.student_name}>
                          {submission.student_name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">{submission.student_name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {submission.student_id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </Typography>
                        {submission.is_late && (
                          <Chip
                            label="Late"
                            color="warning"
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {submission.file ? (
                        <Chip
                          icon={<AttachFileIcon />}
                          label={submission.file.split('/').pop()}
                          variant="outlined"
                          size="small"
                          onClick={() => handleDownloadSubmission(submission.id, submission.file.split('/').pop())}
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No file submitted
                        </Typography>
                      )}
                      {submission.comment && (
                        <Tooltip title={submission.comment}>
                          <Chip
                            icon={<CommentIcon />}
                            label="View comment"
                            variant="outlined"
                            size="small"
                            sx={{ ml: 0.5 }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {renderStatusChip(submission)}
                      {submission.graded && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          Graded: {new Date(submission.graded_at).toLocaleString()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, submission.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Menu for submission actions */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          {submissions.find(s => s.id === selectedSubmissionId)?.file && (
            <MenuItem onClick={() => {
              const submission = submissions.find(s => s.id === selectedSubmissionId);
              handleDownloadSubmission(selectedSubmissionId, submission.file.split('/').pop());
            }}>
              <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
              Download Submission
            </MenuItem>
          )}
          <MenuItem onClick={() => {
            const submission = submissions.find(s => s.id === selectedSubmissionId);
            openGradingDialog(submission);
          }}>
            <GradeIcon fontSize="small" sx={{ mr: 1 }} />
            {submissions.find(s => s.id === selectedSubmissionId)?.graded 
              ? 'Edit Grade' 
              : 'Grade Submission'}
          </MenuItem>
        </Menu>

        {/* Grading Dialog */}
        <Dialog 
          open={gradingDialog.open} 
          onClose={closeGradingDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Grade Submission
            <Typography variant="subtitle2" color="textSecondary">
              Student: {gradingDialog.studentName}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            {gradingDialog.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {gradingDialog.error}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  name="newScore"
                  label={`Score (out of ${assignment?.max_score || '?'})`}
                  type="number"
                  fullWidth
                  value={gradingDialog.newScore}
                  onChange={handleGradeChange}
                  inputProps={{ min: 0, max: assignment?.max_score }}
                  required
                  disabled={gradingDialog.submitting}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="feedback"
                  label="Feedback to Student (Optional)"
                  multiline
                  rows={4}
                  fullWidth
                  value={gradingDialog.feedback}
                  onChange={handleGradeChange}
                  disabled={gradingDialog.submitting}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={closeGradingDialog}
              disabled={gradingDialog.submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitGrade}
              variant="contained"
              color="primary"
              startIcon={gradingDialog.submitting ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={gradingDialog.submitting}
            >
              Save Grade
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default SubmissionReview; 