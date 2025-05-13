import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AISessionNotes = ({ sessionId }) => {
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedAINotes, setEditedAINotes] = useState('');
  const [editedTutorNotes, setEditedTutorNotes] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchNotes();
  }, [sessionId]);

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`http://localhost:8000/notes/session/${sessionId}/manage/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotes(response.data);
      
      // Split the content into AI notes and tutor notes sections
      const contentParts = response.data.content.split('---');
      const aiNotes = contentParts[0]?.replace('AI Generated Notes:', '').trim() || '';
      const tutorNotes = contentParts[1]?.replace('Tutor Notes:', '').trim() || '';
      
      setEditedTitle(response.data.title || '');
      setEditedSubject(response.data.subject || '');
      setEditedAINotes(aiNotes);
      setEditedTutorNotes(tutorNotes);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError('Failed to load session notes');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const formattedContent = `AI Generated Notes:\n\n${editedAINotes}\n\n---\n\nTutor Notes:\n\n${editedTutorNotes}`;
      
      const response = await axios.post(`http://localhost:8000/notes/session/${sessionId}/manage/`, {
        title: editedTitle,
        subject: editedSubject,
        content: formattedContent,
        is_approved: notes.is_approved,
        tutor_notes: editedTutorNotes
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Update the local state with the response data
      setNotes(response.data);
      
      // Split the content from the response
      const contentParts = response.data.content.split('---');
      const aiNotes = contentParts[0]?.replace('AI Generated Notes:', '').trim() || '';
      const tutorNotes = contentParts[1]?.replace('Tutor Notes:', '').trim() || '';
      
      // Update the edited states with the response data
      setEditedTitle(response.data.title || '');
      setEditedSubject(response.data.subject || '');
      setEditedAINotes(aiNotes);
      setEditedTutorNotes(tutorNotes);
      
      setSuccess(true);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      setError('Failed to save notes');
    }
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const formattedContent = `AI Generated Notes:\n\n${editedAINotes}\n\n---\n\nTutor Notes:\n\n${editedTutorNotes}`;
      
      const response = await axios.post(`http://localhost:8000/notes/session/${sessionId}/manage/`, {
        title: editedTitle,
        subject: editedSubject,
        content: formattedContent,
        is_approved: true,
        tutor_notes: editedTutorNotes
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Update the local state with the response data
      setNotes(response.data);
      
      // Split the content from the response
      const contentParts = response.data.content.split('---');
      const aiNotes = contentParts[0]?.replace('AI Generated Notes:', '').trim() || '';
      const tutorNotes = contentParts[1]?.replace('Tutor Notes:', '').trim() || '';
      
      // Update the edited states with the response data
      setEditedTitle(response.data.title || '');
      setEditedSubject(response.data.subject || '');
      setEditedAINotes(aiNotes);
      setEditedTutorNotes(tutorNotes);
      
      setSuccess(true);
      setIsEditing(false);
    } catch (error) {
      console.error('Error approving notes:', error);
      setError('Failed to approve notes');
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
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

  if (!notes) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No notes available for this session
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" color="primary">
            Session Notes
          </Typography>
          <Box>
            {!isEditing ? (
              <Tooltip title="Edit Notes">
                <IconButton onClick={() => setIsEditing(true)} color="primary">
                  <EditIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <>
                <Tooltip title="Save Changes">
                  <IconButton onClick={handleSave} color="primary" sx={{ mr: 1 }}>
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Approve & Share">
                  <IconButton 
                    onClick={handleApprove}
                    color="success"
                    disabled={notes.is_approved}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {isEditing ? (
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Title"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Subject"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
          </Box>
        ) : (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              {editedTitle || 'Untitled Notes'}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {editedSubject || 'General'}
            </Typography>
          </Box>
        )}

        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="AI Notes" />
          <Tab label="Tutor Notes" />
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 0 ? (
            <Box>
              {isEditing ? (
                <TextField
                  fullWidth
                  multiline
                  rows={12}
                  value={editedAINotes}
                  onChange={(e) => setEditedAINotes(e.target.value)}
                  variant="outlined"
                />
              ) : (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {editedAINotes}
                </Typography>
              )}
            </Box>
          ) : (
            <Box>
              {isEditing ? (
                <TextField
                  fullWidth
                  multiline
                  rows={12}
                  value={editedTutorNotes}
                  onChange={(e) => setEditedTutorNotes(e.target.value)}
                  variant="outlined"
                  placeholder="Add your notes, feedback, or suggestions here..."
                />
              ) : (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {editedTutorNotes || 'No tutor notes available'}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {notes.is_approved && (
          <Alert severity="success" sx={{ mt: 2 }}>
            These notes have been approved and are visible to the student
          </Alert>
        )}
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Notes updated successfully
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AISessionNotes; 