import React from 'react';
import ReactMarkdown from 'react-markdown';

const MeetingNotes = ({ notes }) => {
  if (!notes) return null;

  return (
    <div className="meeting-notes">
      <ReactMarkdown>{notes}</ReactMarkdown>
    </div>
  );
};

export default MeetingNotes; 