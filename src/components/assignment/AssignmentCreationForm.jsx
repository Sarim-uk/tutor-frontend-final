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
  FormHelperText,
  Alert,
  Stack,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { createAssignment, fetchStudentSummary } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AssignmentCreationForm = ({ onCancel, onSuccess }) => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: null,
    status: 'Draft',
    max_score: 100,
    file: null,
    student_ids: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  
  // Fetch students when component mounts
  useEffect(() => {
    const getStudents = async () => {
      setLoadingStudents(true);
      try {
        const studentData = await fetchStudentSummary();
        console.log("Fetched student data:", studentData);
        
        // Don't filter the students - show all students since the API already returns 
        // only students relevant to the current teacher
        setStudents(studentData);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load students. You may need to refresh the page.");
      } finally {
        setLoadingStudents(false);
      }
    };
    
    getStudents();
  }, [user]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is updated
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const handleDateChange = (e) => {
    setFormData(prev => ({ ...prev, due_date: e.target.value }));
    
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
    
    if (!formData.student_ids) {
      errors.student_ids = 'Please select a student for this assignment';
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
      
      // Ensure student_ids is properly formatted
      console.log("Submitting student_ids:", formData.student_ids);
      assignmentData.append('student_ids', formData.student_ids);
      
      if (formData.due_date) {
        assignmentData.append('due_date', new Date(formData.due_date).toISOString());
      }
      
      if (formData.file) {
        assignmentData.append('file', formData.file);
      }
      
      console.log("Assignment data being sent:", {
        title: formData.title,
        description: formData.description.substring(0, 30) + "...",
        status: formData.status,
        max_score: formData.max_score,
        student_ids: formData.student_ids,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        file: formData.file ? formData.file.name : null
      });
      
      const response = await createAssignment(assignmentData);
      console.log("Assignment creation response:", response);
      setSuccessMessage('Assignment created successfully!');
      
      // Call success callback after short delay
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
      
    } catch (err) {
      console.error("Error creating assignment:", err);
      setError("Failed to create assignment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  
  const getFileLabel = () => {
    if (formData.file) {
      return formData.file.name;
    } else {
      return 'Upload assignment instructions or materials';
    }
  };
  
  return (
    <Box>
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
            <TextField
              name="due_date"
              label="Due Date (Optional)"
              type="datetime-local"
              fullWidth
              value={formData.due_date || ''}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
              disabled={submitting}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              name="max_score"
              label="Maximum Score"
              type="number"
              fullWidth
              value={formData.max_score}
              onChange={handleChange}
              error={Boolean(formErrors.max_score)}
              helperText={formErrors.max_score}
              disabled={submitting}
              InputProps={{ inputProps: { min: 0, max: 1000 } }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                label="Status"
                onChange={handleChange}
                disabled={submitting}
              >
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Published">Published</MenuItem>
              </Select>
              <FormHelperText>
                {formData.status === 'Draft' ? 'Only visible to you' : 'Will be visible to students'}
              </FormHelperText>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={Boolean(formErrors.student_ids)}>
              <InputLabel>Student</InputLabel>
              <Select
                name="student_ids"
                value={formData.student_ids}
                label="Student"
                onChange={handleChange}
                disabled={submitting || loadingStudents}
              >
                {loadingStudents ? (
                  <MenuItem disabled>Loading students...</MenuItem>
                ) : students.length > 0 ? (
                  students.map(student => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.first_name || student.firstName} {student.last_name || student.lastName}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No students found</MenuItem>
                )}
              </Select>
              {formErrors.student_ids && (
                <FormHelperText>{formErrors.student_ids}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={submitting}
              >
                Upload File
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                  disabled={submitting}
                />
              </Button>
              
              {formData.file && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Chip 
                    label={getFileLabel()}
                    onDelete={handleRemoveFile}
                    deleteIcon={<DeleteIcon />}
                    disabled={submitting}
                  />
                </Box>
              )}
            </Stack>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Assignment'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default AssignmentCreationForm; 