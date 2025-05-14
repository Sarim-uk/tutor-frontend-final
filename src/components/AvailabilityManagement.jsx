import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Stack,
  Card,
  CardContent,
  Grid,
  Autocomplete,
  Chip,
  LinearProgress,
  Snackbar,
  InputAdornment,
  FormHelperText,
  Collapse
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  EventAvailable as AvailabilityIcon,
  EventBusy as UnavailableIcon,
  CalendarMonth as CalendarIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Public as TimeZoneIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchTutorAvailability,
  addTutorAvailabilitySlot,
  updateTutorAvailabilitySlot,
  deleteTutorAvailabilitySlot
} from '../services/api';

// List of common time zones
const TIME_ZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' }
];

const weekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

function AvailabilityManagement() {
  const { user } = useAuth();
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [filteredSlots, setFilteredSlots] = useState([]);
  const [openSlotDialog, setOpenSlotDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [slotFormData, setSlotFormData] = useState({
    day: 'Monday',
    start_time: '',
    end_time: '',
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone // default to browser time zone
  });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [deleteSlotId, setDeleteSlotId] = useState(null);
  const [deleteSlotDetails, setDeleteSlotDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // For specific actions like add/edit/delete
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSlots: 0,
    slotsByDay: {}
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    day: '',
    status: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAvailabilitySlots();
  }, [user]);

  useEffect(() => {
    // Apply filters when slots or filters change
    applyFilters();
  }, [availabilitySlots, filters]);

  const fetchAvailabilitySlots = async () => {
    if (!user?.userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Log the user ID information for debugging
      console.log('User ID:', user.userId);
      
      // Use the userId directly without conversion
      const slots = await fetchTutorAvailability(user.userId);
      setAvailabilitySlots(slots);
      setFilteredSlots(slots); // Initially set filtered slots to all slots
      
      // Calculate stats
      const slotsByDay = slots.reduce((acc, slot) => {
        acc[slot.day] = (acc[slot.day] || 0) + 1;
        return acc;
      }, {});
      
      setStats({
        totalSlots: slots.length,
        slotsByDay
      });
    } catch (error) {
      console.error('Error fetching availability slots:', error);
      
      // Handle various error conditions
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setError('Request timed out. The server is taking too long to respond. Please try again later.');
      } else if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
        setError('Network connection error. Please check your internet connection and verify the server is running.');
      } else if (error.response) {
        // Server responded with an error status
        if (error.response.status === 404) {
          setError('Tutor profile not found. Please make sure you have a valid tutor profile or contact support.');
        } else if (error.response.status === 401 || error.response.status === 403) {
          setError('Authentication error. Please try logging out and logging back in.');
        } else {
          setError(`Server error (${error.response.status}): ${error.response.data?.detail || 'Unknown error'}`);
        }
      } else {
        setError('Failed to load availability slots. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSlotDialog = (slot = null) => {
    if (slot) {
      setSelectedSlot(slot);
      setSlotFormData({
        day: slot.day,
        start_time: slot.start_time,
        end_time: slot.end_time,
        time_zone: slot.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    } else {
      setSelectedSlot(null);
      setSlotFormData({
        day: 'Monday',
        start_time: '',
        end_time: '',
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone
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

    // Check for overlapping slots
    if (slotFormData.start_time && slotFormData.end_time && slotFormData.day) {
      const overlappingSlot = availabilitySlots.find(slot => {
        // Skip the current slot if we're editing
        if (selectedSlot && slot.id === selectedSlot.id) {
          return false;
        }
        
        // Check if the slot is on the same day
        if (slot.day !== slotFormData.day) {
          return false;
        }
        
        // Check for overlap: new start is before existing end AND new end is after existing start
        const overlaps = (
          slotFormData.start_time < slot.end_time && 
          slotFormData.end_time > slot.start_time
        );
        
        return overlaps;
      });
      
      if (overlappingSlot) {
        errors.overlap = `This slot overlaps with your existing availability on ${overlappingSlot.day} from ${formatTime(overlappingSlot.start_time)} to ${formatTime(overlappingSlot.end_time)}`;
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitSlot = async () => {
    if (!validateForm()) return;
    
    try {
      setActionLoading(true);
      
      // Use userId directly without conversion
      const userId = user.userId;
      
      if (selectedSlot) {
        // Update existing slot
        await updateTutorAvailabilitySlot(
          userId,
          selectedSlot.id,
          slotFormData
        );
        
        setSnackbar({
          open: true,
          message: 'Availability slot updated successfully',
          severity: 'success'
        });
      } else {
        // Add new slot(s)
        const result = await addTutorAvailabilitySlot(userId, slotFormData);
        
        // Handle the enhanced response format
        const createdCount = result.created_count || (Array.isArray(result) ? result.length : 1);
        const skippedCount = result.skipped_count || 0;
        
        let message;
        let severity = 'success';
        
        if (createdCount > 0 && skippedCount > 0) {
          message = `Created ${createdCount} availability slots. ${skippedCount} slots were skipped because they already exist or overlap with existing slots.`;
          severity = 'info';
        } else if (createdCount > 0) {
          message = createdCount > 1 
            ? `${createdCount} availability slots created successfully` 
            : 'Availability slot added successfully';
        } else {
          // This should not happen with our backend changes, but just in case
          message = 'No new slots could be created. They may overlap with existing slots.';
          severity = 'warning';
        }
        
        setSnackbar({
          open: true,
          message: message,
          severity: severity
        });
      }
      
      handleCloseSlotDialog();
      fetchAvailabilitySlots(); // Refresh the list
    } catch (error) {
      console.error('Error submitting availability slot:', error);
      
      // Improved error handling
      let errorMessage = 'Failed to save availability slot';
      
      if (error.response?.data) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        }
        
        if (error.response.data.skipped_slots && error.response.data.skipped_slots.length > 0) {
          const reasons = new Set(error.response.data.skipped_slots.map(slot => slot.reason));
          if (reasons.size === 1) {
            errorMessage += `: ${Array.from(reasons)[0]}`;
          } else {
            errorMessage += ': Slots overlap with existing availability';
          }
        }
      }
      
      setSnackbar({
        open: true,
        message: `Error: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteConfirm = (slotId) => {
    const slotToDelete = availabilitySlots.find(slot => slot.id === slotId);
    setDeleteSlotId(slotId);
    setDeleteSlotDetails(slotToDelete);
    setDeleteConfirmDialog(true);
  };

  const handleDeleteSlot = async () => {
    if (!deleteSlotId) return;
    
    try {
      setActionLoading(true);
      
      // Use userId directly without conversion
      const userId = user.userId;
      
      await deleteTutorAvailabilitySlot(userId, deleteSlotId);
      
      setSnackbar({
        open: true,
        message: 'Availability slot deleted successfully',
        severity: 'success'
      });
      
      // Close dialog and refresh the list
      setDeleteConfirmDialog(false);
      setDeleteSlotId(null);
      setDeleteSlotDetails(null);
      fetchAvailabilitySlots();
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.detail || 'Failed to delete availability slot'}`,
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      day: '',
      status: '',
      search: ''
    });
  };

  // Apply filters to the availability slots
  const applyFilters = () => {
    let filtered = [...availabilitySlots];
    
    // Filter by day
    if (filters.day) {
      filtered = filtered.filter(slot => slot.day === filters.day);
    }
    
    // Filter by status (booked/available)
    if (filters.status) {
      filtered = filtered.filter(slot => {
        if (filters.status === 'booked') {
          return slot.is_booked;
        } else if (filters.status === 'available') {
          return !slot.is_booked;
        }
        return true;
      });
    }
    
    // Filter by search term (day or time)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(slot => 
        slot.day.toLowerCase().includes(searchLower) ||
        formatTime(slot.start_time).toLowerCase().includes(searchLower) ||
        formatTime(slot.end_time).toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredSlots(filtered);
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

  // Get display name for time zone
  const getTimeZoneDisplay = (timeZoneValue) => {
    const timeZone = TIME_ZONES.find(tz => tz.value === timeZoneValue);
    return timeZone ? timeZone.label : timeZoneValue;
  };

  // Group slots by day for the calendar view
  const slotsByDay = weekDays.map(day => ({
    day,
    slots: filteredSlots.filter(slot => slot.day === day)
  }));

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom component="div" sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AvailabilityIcon sx={{ mr: 1 }} />
        Availability Management
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Loading availability slots...
          </Typography>
        </Box>
      ) : error ? (
        <Box sx={{ mt: 2 }}>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={fetchAvailabilitySlots}>
                <RefreshIcon fontSize="small" sx={{ mr: 0.5 }} />
                Retry
              </Button>
            }
          >
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        </Box>
      ) : (
        <>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 4
          }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#052453', display: 'flex', alignItems: 'center' }}>
              <CalendarIcon sx={{ mr: 1 }} />
              Availability Management
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button 
                variant="outlined" 
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={fetchAvailabilitySlots}
                disabled={loading || actionLoading}
              >
                Refresh
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => handleOpenSlotDialog()}
                disabled={loading || actionLoading}
              >
                Add Availability Slot
              </Button>
            </Stack>
          </Box>
          
          {/* Filters Panel */}
          <Collapse in={showFilters}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Filter Availability Slots</Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4} md={3}>
                  <FormControl fullWidth>
                    <InputLabel id="day-filter-label">Day</InputLabel>
                    <Select
                      labelId="day-filter-label"
                      id="day-filter"
                      value={filters.day}
                      label="Day"
                      onChange={(e) => handleFilterChange('day', e.target.value)}
                    >
                      <MenuItem value="">All Days</MenuItem>
                      {weekDays.map(day => (
                        <MenuItem key={day} value={day}>{day}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                  <FormControl fullWidth>
                    <InputLabel id="status-filter-label">Status</InputLabel>
                    <Select
                      labelId="status-filter-label"
                      id="status-filter"
                      value={filters.status}
                      label="Status"
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <MenuItem value="">All Status</MenuItem>
                      <MenuItem value="available">Available</MenuItem>
                      <MenuItem value="booked">Booked</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} md={3}>
                  <TextField
                    fullWidth
                    label="Search"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Collapse>
          
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                elevation={2}
                sx={{ 
                  borderRadius: 2,
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  }
                }}
              >
                <CardContent sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                      Total Availability Slots
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#052453' }}>
                      {stats.totalSlots}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {filteredSlots.length !== availabilitySlots.length && 
                        `${filteredSlots.length} shown with current filters`}
                    </Typography>
                  </Box>
                  <AvailabilityIcon sx={{ fontSize: 56, color: 'primary.main' }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                elevation={2}
                sx={{ 
                  borderRadius: 2,
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  }
                }}
              >
                <CardContent sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                      Weekday Availability
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#052453' }}>
                      {Object.keys(stats.slotsByDay).filter(day => 
                        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day)
                      ).length} days
                    </Typography>
                  </Box>
                  <TimeIcon sx={{ fontSize: 56, color: 'primary.main' }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card 
                elevation={2}
                sx={{ 
                  borderRadius: 2,
                  transition: 'transform 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  }
                }}
              >
                <CardContent sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Box>
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                      Weekend Availability
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#052453' }}>
                      {Object.keys(stats.slotsByDay).filter(day => 
                        ['Saturday', 'Sunday'].includes(day)
                      ).length} days
                    </Typography>
                  </Box>
                  <UnavailableIcon sx={{ fontSize: 56, color: 'secondary.main' }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Calendar View */}
          <Typography variant="h5" sx={{ mb: 2, color: '#052453', fontWeight: 'bold' }}>
            Weekly Schedule
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {slotsByDay.map(({ day, slots }) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={day}>
                <Paper elevation={2} sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    {day}
                  </Typography>
                  {slots.length === 0 ? (
                    <Alert severity="info" sx={{ my: 1 }}>
                      No availability set
                    </Alert>
                  ) : (
                    slots.map(slot => (
                      <Paper 
                        key={slot.id} 
                        sx={{ 
                          p: 1, 
                          mb: 1, 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          bgcolor: slot.is_booked ? 'error.lighter' : 'primary.lighter',
                          borderLeft: '4px solid',
                          borderColor: slot.is_booked ? 'error.main' : 'primary.main'
                        }}
                      >
                        <Box>
                          <Typography variant="body2">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <TimeZoneIcon sx={{ fontSize: 12, mr: 0.5 }} />
                            {getTimeZoneDisplay(slot.time_zone || 'UTC')}
                            {slot.is_booked && (
                              <Chip 
                                size="small" 
                                color="error" 
                                label="Booked" 
                                sx={{ ml: 1, height: 20, '& .MuiChip-label': { px: 1, py: 0.2 } }}
                              />
                            )}
                          </Typography>
                        </Box>
                        <Box>
                          {slot.is_booked ? (
                            <Tooltip title="This slot is currently booked">
                              <IconButton 
                                size="small" 
                                color="warning"
                                disabled
                              >
                                <WarningIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <>
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
                            </>
                          )}
                        </Box>
                      </Paper>
                    ))
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Table View */}
          <Typography variant="h5" sx={{ mb: 2, color: '#052453', fontWeight: 'bold' }}>
            All Availability Slots
          </Typography>
          {filteredSlots.length === 0 ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {availabilitySlots.length === 0 
                ? "You haven't set any availability slots yet. Add your first slot to let students know when you're available."
                : "No slots match your current filters. Try changing your filter criteria or resetting filters."}
            </Alert>
          ) : (
            <TableContainer component={Paper} elevation={2} sx={{ mb: 3, borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell>Day</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Time Zone</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSlots.map((slot) => (
                    <TableRow 
                      key={slot.id}
                      sx={{ 
                        bgcolor: slot.is_booked ? 'rgba(244, 67, 54, 0.05)' : 'inherit'
                      }}
                    >
                      <TableCell>{slot.day}</TableCell>
                      <TableCell>{formatTime(slot.start_time)}</TableCell>
                      <TableCell>{formatTime(slot.end_time)}</TableCell>
                      <TableCell>{getTimeZoneDisplay(slot.time_zone || 'UTC')}</TableCell>
                      <TableCell>
                        {slot.is_booked ? (
                          <Chip 
                            size="small" 
                            color="error" 
                            label="Booked" 
                          />
                        ) : (
                          <Chip 
                            size="small" 
                            color="success" 
                            label="Available" 
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          {slot.is_booked ? (
                            <Tooltip title="This slot is currently booked">
                              <IconButton 
                                size="small" 
                                color="warning"
                                disabled
                              >
                                <WarningIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <>
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
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
      
      {/* Add/Edit Slot Dialog */}
      <Dialog 
        open={openSlotDialog} 
        onClose={handleCloseSlotDialog} 
        maxWidth="sm" 
        fullWidth
        aria-labelledby="availability-dialog-title"
      >
        <DialogTitle id="availability-dialog-title">
          {selectedSlot ? 'Edit Availability Slot' : 'Add Availability Slot'}
        </DialogTitle>
        {actionLoading && <LinearProgress />}
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
                error={!!formErrors.day}
              >
                {weekDays.map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.day && <FormHelperText error>{formErrors.day}</FormHelperText>}
            </FormControl>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
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
              </Grid>
              <Grid item xs={12} sm={6}>
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
              </Grid>
            </Grid>
            
            {!selectedSlot && (
              <FormHelperText>
                Enter the entire time range you're available. The system will automatically create 1-hour slots.
                For example, 9:00 - 12:00 will create three slots: 9:00-10:00, 10:00-11:00, and 11:00-12:00.
              </FormHelperText>
            )}
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="time-zone-select-label">Time Zone</InputLabel>
              <Select
                labelId="time-zone-select-label"
                id="time-zone-select"
                name="time_zone"
                value={slotFormData.time_zone}
                onChange={handleInputChange}
                label="Time Zone"
              >
                {TIME_ZONES.map((zone) => (
                  <MenuItem key={zone.value} value={zone.value}>
                    {zone.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Select the time zone for this availability slot
              </FormHelperText>
            </FormControl>
            
            {formErrors.overlap && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {formErrors.overlap}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSlotDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmitSlot} 
            variant="contained" 
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : selectedSlot ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmDialog} 
        onClose={() => !actionLoading && setDeleteConfirmDialog(false)}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">Confirm Delete</DialogTitle>
        {actionLoading && <LinearProgress />}
        <DialogContent>
          {deleteSlotDetails ? (
            <>
              <Typography variant="h6" gutterBottom>
                Are you sure you want to delete this availability slot?
              </Typography>
              <Typography sx={{ mb: 2 }}>
                This action cannot be undone. The following slot will be deleted:
              </Typography>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.lighter' }}>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  {deleteSlotDetails.day}
                </Typography>
                <Typography variant="body2">
                  {formatTime(deleteSlotDetails.start_time)} - {formatTime(deleteSlotDetails.end_time)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Time Zone: {getTimeZoneDisplay(deleteSlotDetails.time_zone || 'UTC')}
                </Typography>
              </Paper>
              {deleteSlotDetails.is_booked && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <AlertTitle>Warning: This slot is currently booked!</AlertTitle>
                  Deleting this slot will cancel any student bookings. Make sure to notify affected students.
                </Alert>
              )}
            </>
          ) : (
            <Typography>
              Are you sure you want to delete this availability slot? This action cannot be undone.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmDialog(false)} 
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteSlot} 
            color="error" 
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AvailabilityManagement; 