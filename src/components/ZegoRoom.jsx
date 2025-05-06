import React, { useEffect } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { APP_ID, APP_SIGN } from '../config/zegoCloud';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

const ZegoRoom = ({ roomId, userName, userId, role = 'Host', onLeaveRoom }) => {
  const navigate = useNavigate();
  const roomRef = React.useRef(null);

  useEffect(() => {
    if (!roomId || !userId) {
      console.error("Room ID and User ID are required");
      return;
    }

    // Get the actual DOM element
    const element = roomRef.current;
    if (!element) return;

    // Create a room instance
    const initRoom = async () => {
      // Get token
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        APP_ID,
        APP_SIGN,
        roomId,
        userId,
        userName || `Teacher-${userId}`
      );

      // Create instance
      const zp = ZegoUIKitPrebuilt.create(kitToken);

      // Join room
      zp.joinRoom({
        container: element,
        scenario: {
          mode: ZegoUIKitPrebuilt.GroupCall,
        },
        sharedLinks: [
          {
            name: 'Copy Link',
            url: `${window.location.origin}/room/${roomId}`,
          },
        ],
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: true,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: true,
        showTextChat: true,
        showUserList: true,
        maxUsers: 50,
        layout: "Grid",
        showLayoutButton: true,
        onLeaveRoom: () => {
          // Handle leaving room
          if (onLeaveRoom) {
            onLeaveRoom();
          } else {
            navigate('/dashboard');
          }
        }
      });
    };

    initRoom();

    // Cleanup function
    return () => {
      // Any cleanup code
    };
  }, [roomId, userId, userName, onLeaveRoom, navigate]);

  return (
    <Box 
      sx={{
        width: '100%',
        height: '100%',
        minHeight: '600px',
        backgroundColor: 'background.paper',
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {(!roomId || !userId) && (
        <Box 
          sx={{ 
            p: 3, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}
        >
          <Typography variant="h6" color="error">
            Missing room information
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Room ID and User ID are required to join a meeting.
          </Typography>
        </Box>
      )}
      
      <Box
        ref={roomRef}
        sx={{
          width: '100%',
          height: '100%',
          flex: 1
        }}
      />
    </Box>
  );
};

export default ZegoRoom; 