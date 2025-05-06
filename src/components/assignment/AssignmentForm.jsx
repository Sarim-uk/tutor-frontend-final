import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  IconButton,
  FormHelperText,
  Alert,
  Stack,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { createAssignment, updateAssignment, getAssignmentDetails } from '../../services/api';

const AssignmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: null,
    status: 'Draft',
    max_score: 100,
    file: null
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [existingFile, setExistingFile] = useState(null);
  
  useEffect(() => {
    if (isEditing) {
      fetchAssignmentDetails();
    }
  }, [id]);
  
  const fetchAssignmentDetails = async () => {
    try {
      const assignment = await getAssignmentDetails(id);
      
      setFormData({
        title: assignment.title || '',
        description: assignment.description || '',
        due_date: assignment.due_date ? new Date(assignment.due_date) : null,
        status: assignment.status || 'Draft',
        max_score: assignment.max_score || 100,
        file: null
      });
      
      if (assignment.file) {
        setExistingFile(assignment.file);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching assignment details:", err);
      setError("Failed to load assignment details. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is updated
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const handleDateChange = (newDate) => {
    setFormData(prev => ({ ...prev, due_date: newDate }));
    
    if (formErrors.due_date) {
      setFormErrors(prev => ({ ...prev, due_date: null }));
    }
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
      setFormErrors(prev => ({ ...prev, file: null }));
    }
  };
  
  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, file: null }));
    // If we're removing an existing file during edit
    if (isEditing && existingFile) {
      setExistingFile(null);
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (formData.max_score < 0 || formData.max_score > 1000) {
      errors.max_score = 'Score must be between 0 and 1000';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const assignmentData = new FormData();
      
      assignmentData.append('title', formData.title);
      assignmentData.append('description', formData.description);
      assignmentData.append('status', formData.status);
      assignmentData.append('max_score', formData.max_score);
      
      if (formData.due_date) {
        assignmentData.append('due_date', formData.due_date.toISOString());
      }
      
      if (formData.file) {
        assignmentData.append('file', formData.file);
      } else if (isEditing && existingFile === null) {
        // If editing and the existing file was removed
        assignmentData.append('remove_file', 'true');
      }
      
      if (isEditing) {
        await updateAssignment(id, assignmentData);
        setSuccessMessage('Assignment updated successfully!');
      } else {
        await createAssignment(assignmentData);
        setSuccessMessage('Assignment created successfully!');
      }
      
      // Redirect after short delay to show success message
      setTimeout(() => {
        navigate('/assignments');
      }, 1500);
      
    } catch (err) {
      console.error("Error submitting assignment:", err);
      setError("Failed to save assignment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    navigate('/assignments');
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  const getFileLabel = () => {
    if (formData.file) {
      return formData.file.name;
    } else if (existingFile) {
      return existingFile.split('/').pop();
    } else {
      return 'Upload assignment instructions or materials';
    }
  };
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box p={3}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" mb={3}>
            <IconButton 
              onClick={handleCancel}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1">
              {isEditing ? 'Edit Assignment' : 'Create Assignment'}
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {successMessage && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {successMessage}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  name="title"
                  label="Assignment Title"
                  fullWidth
                  required
                  value={formData.title}
                  onChange={handleChange}
                  error={Boolean(formErrors.title)}
                  helperText={formErrors.title}
                  disabled={submitting}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Assignment Description"
                  fullWidth
                  required
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  error={Boolean(formErrors.description)}
                  helperText={formErrors.description}
                  disabled={submitting}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <DateTimePicker
                    label="Due Date (Optional)"
                    value={formData.due_date}
                    onChange={handleDateChange}
                    renderInput={(params) => <TextField {...params} />}
                    disabled={submitting}
                  />
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  name="max_score"
                  label="Maximum Score"
                  type="number"
                  fullWidth
                  required
                  value={formData.max_score}
                  onChange={handleChange}
                  inputProps={{ min: 0, max: 1000 }}
                  error={Boolean(formErrors.max_score)}
                  helperText={formErrors.max_score}
                  disabled={submitting}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Assignment Materials
                </Typography>
                
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    sx={{ 
                      height: '56px',
                      borderStyle: formData.file || existingFile ? 'solid' : 'dashed' 
                    }}
                    disabled={submitting}
                  >
                    {formData.file || existingFile ? 'Change File' : 'Upload File'}
                    <input
                      type="file"
                      hidden
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.txt,.zip,.rar"
                    />
                  </Button>
                  
                  {(formData.file || existingFile) && (
                    <>
                      <Chip
                        icon={<DescriptionIcon />}
                        label={getFileLabel()}
                        color="primary"
                        variant="outlined"
                      />
                      
                      <Tooltip title="Remove file">
                        <IconButton 
                          onClick={handleRemoveFile}
                          color="error"
                          disabled={submitting}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Assignment Settings
                </Typography>
                
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="Status"
                    disabled={submitting}
                  >
                    <MenuItem value="Draft">Save as Draft</MenuItem>
                    <MenuItem value="Published">Publish to Students</MenuItem>
                  </Select>
                  <FormHelperText>
                    {formData.status === 'Published' 
                      ? 'Students will be able to see and submit to this assignment'
                      : 'Only visible to you until published'
                    }
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    startIcon={<CloseIcon />}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                    disabled={submitting}
                  >
                    {isEditing ? 'Update Assignment' : 'Create Assignment'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default AssignmentForm; 