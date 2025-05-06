import React from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { VideoCall as VideoIcon } from '@mui/icons-material';

/**
 * A button component that initiates a ZegoCloud video call session
 * 
 * @param {Object} props - The component props
 * @param {string} props.lessonId - The ID of the lesson to create a room for
 * @param {string} props.label - The button label text (default: "Join Video Call")
 * @param {Object} props.buttonProps - Additional props to pass to the Button component
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {Function} props.onClick - Optional callback when the button is clicked
 * @returns {JSX.Element} The rendered component
 */
const VideoCallButton = ({ 
  lessonId, 
  label = "Join Video Call", 
  buttonProps = {}, 
  disabled = false,
  onClick
}) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    // If an onClick handler is provided, call it first
    if (onClick) {
      onClick(e);
    }

    if (!e.defaultPrevented && !disabled) {
      // Create a consistent room ID format based on the lesson ID
      const roomId = `lesson_${lessonId}`;
      
      // Navigate to the video room
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<VideoIcon />}
      onClick={handleClick}
      disabled={disabled}
      {...buttonProps}
    >
      {label}
    </Button>
  );
};

export default VideoCallButton; 