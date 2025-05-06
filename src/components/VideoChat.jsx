import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Grid,
  Avatar,
  CircularProgress,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  CallEnd,
  ScreenShare,
  StopScreenShare,
  Fullscreen,
  FullscreenExit,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import zegoCloudService from '../services/zegocloud';
import { useAuth } from '../contexts/AuthContext';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';

const VideoContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
}));

const VideoGrid = styled(Grid)({
  flexGrow: 1,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px',
  alignItems: 'center',
  justifyContent: 'center',
});

const VideoWrapper = styled(Box)({
  position: 'relative',
  width: '100%',
  height: '100%',
  borderRadius: '8px',
  overflow: 'hidden',
});

const Video = styled('video')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '8px',
});

const ControlsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(2),
}));

const ControlButton = styled(IconButton)(({ theme }) => ({
  margin: theme.spacing(0, 1),
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const EndCallButton = styled(IconButton)(({ theme }) => ({
  margin: theme.spacing(0, 1),
  backgroundColor: theme.palette.error.main,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.error.dark,
  },
}));

const RemoteVideoGrid = styled(Grid)(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(1),
}));

const LocalVideoBox = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: '150px',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  border: `2px solid ${theme.palette.primary.main}`,
}));

const RemoteVideoBox = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: '200px',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const UserLabel = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: theme.spacing(1),
  left: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: theme.palette.common.white,
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.75rem',
  zIndex: 10,
}));

const VideoChat = ({ sessionId, participants = [], onEndCall }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const containerRef = useRef(null);

  // State
  const [connectionState, setConnectionState] = useState('connecting');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [screenStreamId, setScreenStreamId] = useState(null);
  const [participantList, setParticipantList] = useState({});

  // Initialize the video chat
  useEffect(() => {
    const initializeVideoChat = async () => {
      if (!sessionId || !user?.id) {
        setError('Session information or user data missing');
        return;
      }

      setConnectionState('connecting');

      // Setup callbacks for the ZegoCloud service
      zegoCloudService.onLocalStream = (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setLocalStream(stream);
      };

      zegoCloudService.onRemoteStreamAdded = (peerId, stream) => {
        if (!remoteVideoRefs.current[peerId]) {
          remoteVideoRefs.current[peerId] = React.createRef();
        }

        if (remoteVideoRefs.current[peerId]?.current) {
          remoteVideoRefs.current[peerId].current.srcObject = stream;
        }

        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: stream
        }));
      };

      zegoCloudService.onConnectionStateChanged = (state) => {
        if (state === 'CONNECTED') {
          setConnectionState('connected');
        } else if (state === 'DISCONNECTED') {
          setConnectionState('disconnected');
        } else if (state === 'CONNECTING') {
          setConnectionState('connecting');
        }
      };

      zegoCloudService.onError = (errorMsg) => {
        console.error('Video chat error:', errorMsg);
        setError(errorMsg);
      };

      zegoCloudService.onRoomUserUpdate = (roomID, updateType, userList) => {
        if (updateType === 'ADD') {
          userList.forEach(user => {
            if (user.userID !== user?.id) {
              setParticipantList(prev => ({
                ...prev,
                [user.userID]: {
                  id: user.userID,
                  name: user.userName,
                  joinedAt: new Date().toISOString()
                }
              }));
            }
          });
        } else if (updateType === 'DELETE') {
          userList.forEach(user => {
            setParticipantList(prev => {
              const updated = { ...prev };
              delete updated[user.userID];
              return updated;
            });
          });
        }
      };

      try {
        // Initialize the ZegoCloud service with userId
        await zegoCloudService.initialize(user.id, user.name || 'Teacher');
        
        // Join the room
        await zegoCloudService.joinRoom(sessionId);
        
        // Start local stream
        await zegoCloudService.startLocalStream({ video: true, audio: true });
        
        // Publish the stream
        await zegoCloudService.publishStream();
        
        setConnectionState('connected');
      } catch (error) {
        console.error('Failed to initialize video call:', error);
        setError('Failed to initialize video call. Please check your camera and microphone permissions.');
        setConnectionState('error');
      }
    };

    initializeVideoChat();

    // Clean up when component unmounts
    return () => {
      zegoCloudService.leaveRoom();
    };
  }, [sessionId, user]);

  // Toggle audio
  const toggleAudio = async () => {
    const newMutedState = !isAudioMuted;
    await zegoCloudService.muteAudio(newMutedState);
    setIsAudioMuted(newMutedState);
  };

  // Toggle video
  const toggleVideo = async () => {
    const newDisabledState = !isVideoDisabled;
    await zegoCloudService.muteVideo(newDisabledState);
    setIsVideoDisabled(newDisabledState);
  };

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing && screenStream) {
      // Stop screen sharing
      await zegoCloudService.stopScreenSharing(screenStream, screenStreamId);
      setScreenStream(null);
      setScreenStreamId(null);
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const stream = await zegoCloudService.startScreenSharing();
        if (stream) {
          setScreenStream(stream);
          setScreenStreamId(`${sessionId}-${user.id}-screen`);
          setIsScreenSharing(true);
        }
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Handle end call
  const handleEndCall = () => {
    zegoCloudService.leaveRoom();
    if (onEndCall) {
      onEndCall();
    }
  };

  // Handle error state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          Please check your camera and microphone permissions.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={onEndCall || (() => navigate('/dashboard'))}
          startIcon={<RefreshIcon />}
        >
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <VideoContainer ref={containerRef}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Session: {sessionId}
      </Typography>

      {connectionState === 'connecting' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Connecting to session...
          </Typography>
        </Box>
      )}

      {connectionState === 'connected' && (
        <RemoteVideoGrid container spacing={2}>
          {/* Local video */}
          <Grid item xs={12} md={4}>
            <LocalVideoBox>
              <Video ref={localVideoRef} autoPlay playsInline muted />
              <UserLabel>You (Teacher)</UserLabel>
              {isVideoDisabled && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, left: 0, right: 0, bottom: 0, 
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <VideocamOff sx={{ color: 'white', opacity: 0.8 }} />
                </Box>
              )}
            </LocalVideoBox>
          </Grid>

          {/* Remote videos */}
          {Object.entries(remoteStreams).map(([peerId, stream]) => (
            <Grid item xs={12} md={4} key={peerId}>
              <RemoteVideoBox>
                <Video
                  ref={remoteVideoRefs.current[peerId]}
                  autoPlay
                  playsInline
                />
                <UserLabel>{participantList[peerId]?.name || 'Student'}</UserLabel>
              </RemoteVideoBox>
            </Grid>
          ))}

          {/* Empty placeholders if needed */}
          {Object.keys(remoteStreams).length === 0 && (
            <Grid item xs={12} md={8}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  minHeight: '200px',
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  borderRadius: 1,
                  p: 3,
                }}
              >
                <Typography variant="body1">Waiting for students to join...</Typography>
              </Box>
            </Grid>
          )}
        </RemoteVideoGrid>
      )}

      <ControlsContainer>
        {/* Mute/Unmute Audio */}
        <ControlButton
          color={isAudioMuted ? 'default' : 'primary'}
          onClick={toggleAudio}
        >
          {isAudioMuted ? <MicOff /> : <Mic />}
        </ControlButton>

        {/* Enable/Disable Video */}
        <ControlButton
          color={isVideoDisabled ? 'default' : 'primary'}
          onClick={toggleVideo}
        >
          {isVideoDisabled ? <VideocamOff /> : <Videocam />}
        </ControlButton>

        {/* Screen Share */}
        <ControlButton
          color={isScreenSharing ? 'secondary' : 'default'}
          onClick={toggleScreenShare}
        >
          {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
        </ControlButton>

        {/* Fullscreen */}
        <ControlButton onClick={toggleFullscreen}>
          {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
        </ControlButton>

        {/* End Call */}
        <EndCallButton onClick={handleEndCall}>
          <CallEnd />
        </EndCallButton>
      </ControlsContainer>
    </VideoContainer>
  );
};

export default VideoChat; 