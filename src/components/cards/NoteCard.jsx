import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { format } from 'date-fns';

function NoteCard({ note }) {
  return (
    <Card sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
      <CardContent>
        <Typography variant="h6" color="primary">
          Notes for {note.user_ids.first_name} {note.user_ids.last_name}
        </Typography>
        <Box mt={1}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {note.content}
          </Typography>
          
          <Box mt={2} display="flex" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              Date: {format(new Date(note.created_at), 'PPP')}
            </Typography>
            {note.notes_url && (
              <Typography variant="caption" color="primary">
                <a href={note.notes_url} target="_blank" rel="noopener noreferrer">
                  View Full Notes
                </a>
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default NoteCard; 