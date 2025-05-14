import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Grid,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  IconButton,
  DialogTitle,
  DialogContent,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogActions,
  FormHelperText,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  Email as EmailIcon,
  CalendarToday as JoinedIcon,
  School as RoleIcon,
  Group as StudentsIcon,
  VideoCall as MeetingIcon,
  Event as SessionIcon,
  Close as CloseIcon,
  AccessTime as TimeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchTutorSessions, 
  API_BASE_URL, 
  fetchTutorAvailability,
  addTutorAvailabilitySlot,
  updateTutorAvailabilitySlot,
  deleteTutorAvailabilitySlot
} from '../services/api';

const weekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

function Profile({ onClose }) {
  const [profileData, setProfileData] = useState(null);
  const [tutorData, setTutorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSessions: 0,
  });
  const { user } = useAuth();
  
  // Availability states
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [openSlotDialog, setOpenSlotDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [slotFormData, setSlotFormData] = useState({
    day: 'Monday',
    start_time: '',
    end_time: ''
  });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        
        if (!token || !user?.userId) {
          throw new Error('Authentication required');
        }

        // Fetch user profile data
        const userResponse = await fetch(`${API_BASE_URL}/users/${user.userId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const userData = await userResponse.json();
        setProfileData(userData);

        // Fetch tutor-specific data
        const tutorResponse = await fetch(`${API_BASE_URL}/tutors/${user.userId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (tutorResponse.ok) {
          const tutorData = await tutorResponse.json();
          console.log('Tutor data received:', tutorData);  // Debug log
          setTutorData(tutorData);
        } else {
          console.error('Failed to fetch tutor data:', await tutorResponse.text());
        }

        // Fetch sessions to calculate stats
        const sessions = await fetchTutorSessions();
        const uniqueStudents = new Set(sessions.map(session => session.student_ids));
        
        setStats({
          totalStudents: uniqueStudents.size,
          totalSessions: sessions.length,
        });

        // Fetch availability slots
        await fetchAvailabilitySlots();
      } catch (error) {
        console.error('Error in fetchProfileData:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const fetchAvailabilitySlots = async () => {
    if (!user?.userId) return;
    
    try {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      
      const slots = await fetchTutorAvailability(user.userId);
      setAvailabilitySlots(slots);
    } catch (error) {
      console.error('Error fetching availability slots:', error);
      setAvailabilityError('Failed to load availability slots. Please try again.');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleOpenSlotDialog = (slot = null) => {
    if (slot) {
      setSelectedSlot(slot);
      setSlotFormData({
        day: slot.day,
        start_time: slot.start_time,
        end_time: slot.end_time
      });
    } else {
      setSelectedSlot(null);
      setSlotFormData({
        day: 'Monday',
        start_time: '',
        end_time: ''
      });
    }
    setFormErrors({});
    setOpenSlotDialog(true);
  };

  const handleCloseSlotDialog = () => {
    setOpenSlotDialog(false);
    setSelectedSlot(null);
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSlotFormData({
      ...slotFormData,
      [name]: value
    });
    
    // Clear error when field is updated
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Check for empty fields
    if (!slotFormData.start_time) {
      errors.start_time = 'Start time is required';
    }
    
    if (!slotFormData.end_time) {
      errors.end_time = 'End time is required';
    }
    
    // Check if start time is before end time
    if (slotFormData.start_time && slotFormData.end_time) {
      if (slotFormData.start_time >= slotFormData.end_time) {
        errors.end_time = 'End time must be after start time';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSlot = async () => {
    if (!validateForm()) return;
    
    try {
      setAvailabilityLoading(true);
      
      if (selectedSlot) {
        // Update existing slot
        await updateTutorAvailabilitySlot(
          user.userId,
          selectedSlot.id,
          slotFormData
        );
      } else {
        // Add new slot(s) - system will split time range into 1-hour slots
        const result = await addTutorAvailabilitySlot(user.userId, slotFormData);
        
        // Log information about created and skipped slots
        const createdCount = result.created_count || (Array.isArray(result) ? result.length : 1);
        const skippedCount = result.skipped_count || 0;
        
        console.log(`Created ${createdCount} availability slots`);
        if (skippedCount > 0) {
          console.log(`Skipped ${skippedCount} slots (already exist or overlap)`);
        }
      }
      
      // Fetch updated slots
      await fetchAvailabilitySlots();
      handleCloseSlotDialog();
    } catch (error) {
      console.error('Error saving availability slot:', error);
      
      let errorMessage = 'Failed to save availability slot. Please try again.';
      
      if (error.response?.data) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
        
        if (error.response.data.skipped_slots && error.response.data.skipped_slots.length > 0) {
          errorMessage = "Couldn't create slots: they overlap with existing availability.";
        }
      }
      
      setAvailabilityError(errorMessage);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleOpenDeleteConfirm = (slotId) => {
    setDeleteSlotId(slotId);
    setDeleteConfirmDialog(true);
  };

  const handleDeleteSlot = async () => {
    if (!deleteSlotId) return;
    
    try {
      setAvailabilityLoading(true);
      
      await deleteTutorAvailabilitySlot(user.userId, deleteSlotId);
      
      // Fetch updated slots
      await fetchAvailabilitySlots();
      setDeleteConfirmDialog(false);
      setDeleteSlotId(null);
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      setAvailabilityError('Failed to delete availability slot. Please try again.');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Format time for better display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <DialogContent>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </DialogContent>
    );
  }

  if (error) {
    return (
      <DialogContent>
        <Alert severity="error">{error}</Alert>
      </DialogContent>
    );
  }

  return (
    <>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Profile
        {onClose && (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Profile Overview */}
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar
                src={profileData?.profile_picture_url || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}`}
                alt={`${user?.firstName} ${user?.lastName}`}
                sx={{
                  width: 120,
                  height: 120,
                  margin: '0 auto 20px',
                  border: '4px solid',
                  borderColor: 'primary.main',
                }}
              />
              <Typography variant="h5" gutterBottom>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                {user?.role}
              </Typography>
            </Box>
          </Grid>

          {/* Profile Details */}
          <Grid item xs={12} md={8}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <EmailIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Email"
                  secondary={user?.email}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <StudentsIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Students"
                  secondary={`Teaching ${stats.totalStudents} students`}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <SessionIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Sessions"
                  secondary={`${stats.totalSessions} total sessions`}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <MeetingIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary="Personal Meeting Room"
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        This is your permanent meeting link for all students
                      </Typography>
                      <Link 
                        href={tutorData?.meeting_link} 
                        target="_blank" 
                        rel="noopener"
                        sx={{ wordBreak: 'break-all' }}
                      >
                        {tutorData?.meeting_link || 'Not set'}
                      </Link>
                    </>
                  }
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
        
        {/* Availability Management Section */}
        <Box mt={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <TimeIcon sx={{ mr: 1 }} />
              Manage Availability
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpenSlotDialog()}
              disabled={availabilityLoading}
            >
              Add Slot
            </Button>
          </Box>
          
          {availabilityError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {availabilityError}
            </Alert>
          )}
          
          {availabilityLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={40} />
            </Box>
          ) : availabilitySlots.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              You haven't set any availability slots yet. Add your first slot to let students know when you're available.
            </Alert>
          ) : (
            <TableContainer component={Paper} elevation={1} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availabilitySlots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell>{slot.day}</TableCell>
                      <TableCell>{formatTime(slot.start_time)}</TableCell>
                      <TableCell>{formatTime(slot.end_time)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Edit Slot">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleOpenSlotDialog(slot)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Slot">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleOpenDeleteConfirm(slot.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
        
        {/* Add/Edit Slot Dialog */}
        <Dialog open={openSlotDialog} onClose={handleCloseSlotDialog} maxWidth="xs" fullWidth>
          <DialogTitle>
            {selectedSlot ? 'Edit Availability Slot' : 'Add Availability Slot'}
          </DialogTitle>
          <DialogContent>
            <Box component="form" noValidate sx={{ mt: 2 }}>
              {!selectedSlot && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Time ranges will be automatically split into one-hour slots to make scheduling easier for students.
                </Alert>
              )}
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="day-select-label">Day of the Week</InputLabel>
                <Select
                  labelId="day-select-label"
                  id="day-select"
                  name="day"
                  value={slotFormData.day}
                  onChange={handleInputChange}
                  label="Day of the Week"
                >
                  {weekDays.map((day) => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                margin="normal"
                fullWidth
                id="start_time"
                label="Start Time"
                name="start_time"
                type="time"
                value={slotFormData.start_time}
                onChange={handleInputChange}
                error={!!formErrors.start_time}
                helperText={formErrors.start_time}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }} // 5 min steps
              />
              
              <TextField
                margin="normal"
                fullWidth
                id="end_time"
                label="End Time"
                name="end_time"
                type="time"
                value={slotFormData.end_time}
                onChange={handleInputChange}
                error={!!formErrors.end_time}
                helperText={formErrors.end_time}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }} // 5 min steps
              />
              
              {!selectedSlot && (
                <FormHelperText>
                  Enter the entire time range you're available. The system will automatically create 1-hour slots.
                  For example, 9:00 - 12:00 will create three slots: 9:00-10:00, 10:00-11:00, and 11:00-12:00.
                </FormHelperText>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseSlotDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmitSlot} 
              variant="contained" 
              disabled={availabilityLoading}
            >
              {availabilityLoading ? <CircularProgress size={24} /> : selectedSlot ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmDialog} onClose={() => setDeleteConfirmDialog(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this availability slot? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleDeleteSlot} 
              color="error" 
              variant="contained"
              disabled={availabilityLoading}
            >
              {availabilityLoading ? <CircularProgress size={24} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </DialogContent>
    </>
  );
}

export default Profile; 