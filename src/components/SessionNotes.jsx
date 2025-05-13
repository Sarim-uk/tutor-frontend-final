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
  Divider
} from '@mui/material';

const SessionNotes = ({ sessionId }) => {
  const [notes, setNotes] = useState(null);
  const [tutorNotes, setTutorNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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
      setTutorNotes(response.data.tutor_notes || '');
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError('Failed to load session notes');
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`http://localhost:8000/notes/session/${sessionId}/manage/`, {
        content: notes.content,
        tutor_notes: tutorNotes,
        is_approved: true
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess(true);
      fetchNotes(); // Refresh notes after approval
    } catch (error) {
      console.error('Error approving notes:', error);
      setError('Failed to approve notes');
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`http://localhost:8000/notes/session/${sessionId}/manage/`, {
        content: notes.content,
        tutor_notes: tutorNotes,
        is_approved: false
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess(true);
    } catch (error) {
      console.error('Error saving notes:', error);
      setError('Failed to save notes');
    }
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

  // Split the content into AI notes and tutor notes sections
  const contentParts = notes.content.split('---');
  const aiNotes = contentParts[0]?.replace('AI Generated Notes:', '').trim() || '';
  const existingTutorNotes = contentParts[1]?.replace('Tutor Notes:', '').trim() || '';

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          AI Generated Notes
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
          {aiNotes}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom color="primary">
          Your Notes & Feedback
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          value={tutorNotes || existingTutorNotes}
          onChange={(e) => setTutorNotes(e.target.value)}
          placeholder="Add your notes, feedback, or suggestions here..."
          sx={{ mb: 2 }}
        />
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
          >
            Save Draft
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={notes.is_approved}
          >
            {notes.is_approved ? 'Approved' : 'Approve & Share with Student'}
          </Button>
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

export default SessionNotes; 