import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  CircularProgress,
  Paper,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Tooltip,
  Alert,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Assignment as AssignmentIcon,
  Grading as GradingIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fetchTeacherAssignments, deleteAssignment } from '../../services/api';
import AssignmentCreationForm from './AssignmentCreationForm';
import AssignmentEditForm from './AssignmentEditForm';
import SubmissionReviewDialog from './SubmissionReviewDialog';

// Styled component for assignment card
const AssignmentCard = ({ assignment, onDelete, onEdit, onViewSubmissions }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  
  const handleDelete = () => {
    onDelete(assignment.id);
    handleCloseMenu();
  };
  
  const handleEdit = () => {
    onEdit(assignment);
    handleCloseMenu();
  };
  
  const handleViewSubmissions = () => {
    onViewSubmissions(assignment.id);
    handleCloseMenu();
  };
  
  // Format due date
  const formattedDueDate = assignment.due_date 
    ? format(new Date(assignment.due_date), 'MMM d, yyyy • h:mm a')
    : 'No due date';
    
  // Calculate submission stats
  const submissionCount = assignment.submission_count || 0;
  const pendingReview = assignment.pending_review_count || 0;
  const gradedCount = submissionCount - pendingReview;
  
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
        }
      }}
    >
      <Box 
        sx={{ 
          p: 2, 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssignmentIcon sx={{ mr: 1 }} />
          <Typography variant="h6" noWrap sx={{ maxWidth: '180px' }}>
            {assignment.title}
          </Typography>
        </Box>
        
        <Box>
          <Chip 
            size="small" 
            label={assignment.status} 
            color={
              assignment.status === 'Published' ? 'success' : 
              assignment.status === 'Draft' ? 'default' : 'primary'
            }
            sx={{ mr: 1 }}
          />
          <IconButton 
            size="small" 
            edge="end" 
            onClick={handleOpenMenu}
            sx={{ color: 'white' }}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          <ScheduleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
          {formattedDueDate}
        </Typography>
        
        <Typography 
          variant="body2" 
          sx={{ 
            mt: 2, 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {assignment.description}
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          {assignment.file && (
            <Chip 
              label={assignment.file.split('/').pop()} 
              size="small" 
              sx={{ mt: 1, mr: 1 }}
            />
          )}
        </Box>
      </CardContent>
      
      <Divider />
      
      <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Box>
          <Tooltip title="Total submissions">
            <Chip 
              size="small" 
              icon={<AssignmentIcon />} 
              label={`${submissionCount} submissions`}
              sx={{ mr: 1 }}
            />
          </Tooltip>
        </Box>
        
        <Box>
          {pendingReview > 0 && (
            <Tooltip title="Needs review">
              <Chip 
                color="warning" 
                size="small" 
                icon={<GradingIcon />} 
                label={`${pendingReview} pending`}
              />
            </Tooltip>
          )}
          
          {gradedCount > 0 && (
            <Tooltip title="Graded">
              <Chip 
                color="success" 
                size="small" 
                icon={<CheckCircleIcon />} 
                label={`${gradedCount} graded`}
                sx={{ ml: 1 }}
              />
            </Tooltip>
          )}
        </Box>
      </CardActions>
      
      <Menu
        id="assignment-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        MenuListProps={{
          'aria-labelledby': 'assignment-menu-button',
        }}
      >
        <MenuItem onClick={handleViewSubmissions}>
          <GradingIcon fontSize="small" sx={{ mr: 1 }} />
          View Submissions
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

const AssignmentDashboard = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openSubmissionDialog, setOpenSubmissionDialog] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [currentAssignmentId, setCurrentAssignmentId] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchAssignments();
  }, []);
  
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const data = await fetchTeacherAssignments();
      setAssignments(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setError("Failed to load assignments. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateAssignment = () => {
    setOpenCreateDialog(true);
  };
  
  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };
  
  const handleAssignmentCreated = () => {
    fetchAssignments();
    handleCloseCreateDialog();
  };
  
  const handleEditAssignment = (assignment) => {
    setCurrentAssignment(assignment);
    setOpenEditDialog(true);
  };
  
  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setCurrentAssignment(null);
  };
  
  const handleAssignmentUpdated = () => {
    fetchAssignments();
    handleCloseEditDialog();
  };
  
  const handleDeleteAssignment = async (assignmentId) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        await deleteAssignment(assignmentId);
        setAssignments(assignments.filter(a => a.id !== assignmentId));
      } catch (err) {
        setError("Failed to delete assignment. Please try again.");
      }
    }
  };
  
  const handleViewSubmissions = (assignmentId) => {
    setCurrentAssignmentId(assignmentId);
    setOpenSubmissionDialog(true);
  };
  
  const handleCloseSubmissionDialog = () => {
    setOpenSubmissionDialog(false);
    setCurrentAssignmentId(null);
  };
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  const handleFilterChange = (event, newValue) => {
    setFilterValue(newValue);
  };
  
  // Filter assignments based on search query and filter value
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = searchQuery === '' || 
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter = filterValue === 'all' || 
      (filterValue === 'published' && assignment.status === 'Published') ||
      (filterValue === 'draft' && assignment.status === 'Draft') ||
      (filterValue === 'pending_review' && assignment.pending_review_count > 0);
      
    return matchesSearch && matchesFilter;
  });
  
  return (
    <Box p={3}>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}
      >
        <Typography variant="h4" component="h1">
          Assignments
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateAssignment}
        >
          Create Assignment
        </Button>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <TextField
            placeholder="Search assignments..."
            variant="outlined"
            size="small"
            fullWidth
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 400, mr: 2 }}
          />
        </Box>
        
        <Divider />
        
        <Tabs
          value={filterValue}
          onChange={handleFilterChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ px: 2 }}
        >
          <Tab label="All" value="all" />
          <Tab 
            label="Published" 
            value="published" 
            icon={assignments.filter(a => a.status === 'Published').length > 0 ? 
              <Badge 
                color="primary" 
                badgeContent={assignments.filter(a => a.status === 'Published').length} 
                max={99}
              /> : null
            }
            iconPosition="end"
          />
          <Tab 
            label="Drafts" 
            value="draft" 
            icon={assignments.filter(a => a.status === 'Draft').length > 0 ? 
              <Badge 
                color="default" 
                badgeContent={assignments.filter(a => a.status === 'Draft').length} 
                max={99}
              /> : null
            }
            iconPosition="end"
          />
          <Tab 
            label="Needs Grading" 
            value="pending_review" 
            icon={assignments.filter(a => a.pending_review_count > 0).length > 0 ? 
              <Badge 
                color="warning" 
                badgeContent={assignments.filter(a => a.pending_review_count > 0).length} 
                max={99}
              /> : null
            }
            iconPosition="end"
          />
        </Tabs>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : filteredAssignments.length === 0 ? (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            my: 8,
            p: 3,
            textAlign: 'center'
          }}
        >
          <AssignmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No assignments found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {searchQuery 
              ? "Try adjusting your search or filters"
              : "Get started by creating your first assignment"
            }
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateAssignment}
              sx={{ mt: 2 }}
            >
              Create Assignment
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredAssignments.map((assignment) => (
            <Grid item xs={12} sm={6} md={4} key={assignment.id}>
              <AssignmentCard
                assignment={assignment}
                onDelete={handleDeleteAssignment}
                onEdit={handleEditAssignment}
                onViewSubmissions={handleViewSubmissions}
              />
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Assignment Creation Dialog */}
      <Dialog 
        open={openCreateDialog} 
        onClose={handleCloseCreateDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Create New Assignment</Typography>
            <IconButton onClick={handleCloseCreateDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <AssignmentCreationForm 
            onCancel={handleCloseCreateDialog}
            onSuccess={handleAssignmentCreated}
          />
        </DialogContent>
      </Dialog>

      {/* Assignment Edit Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Edit Assignment</Typography>
            <IconButton onClick={handleCloseEditDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentAssignment && (
            <AssignmentEditForm 
              assignment={currentAssignment}
              onCancel={handleCloseEditDialog}
              onSuccess={handleAssignmentUpdated}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Submission Review Dialog */}
      <Dialog 
        open={openSubmissionDialog} 
        onClose={handleCloseSubmissionDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">Assignment Submissions</Typography>
            <IconButton onClick={handleCloseSubmissionDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentAssignmentId && (
            <SubmissionReviewDialog 
              assignmentId={currentAssignmentId}
              onClose={handleCloseSubmissionDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AssignmentDashboard; 