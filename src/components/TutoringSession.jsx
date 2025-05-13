import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import '@fortawesome/fontawesome-free/css/all.min.css';
import MeetingNotes from './MeetingNotes';
import { useSelector } from 'react-redux';

// Simple function to generate a random numeric ID
function getRandomID() {
  return Math.floor(Math.random() * 10000) + "";
}

export function getUrlParams(url = window.location.href) {
  const urlStr = url.split('?')[1];
  if (!urlStr) return {};
  const urlSearchParams = new URLSearchParams(urlStr);
  const result = Object.fromEntries(urlSearchParams.entries());
  return result;
}

export default function TutoringSession({ sessionId }) {
  // Get user and auth data from Redux
  const user = useSelector((state) => state.auth.user);
  const reduxUserId = useSelector((state) => state.auth.user_id);
  
  // Get user data from localStorage as fallback
  const [localUserData, setLocalUserData] = useState(null);
  const [roomID, setRoomID] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const fetchAttempted = useRef(false);
  
  useEffect(() => {
    // Prevent duplicate fetches
    if (fetchAttempted.current) return;
    fetchAttempted.current = true;

    // Fetch room ID from backend
    const fetchRoomID = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          console.error('No authentication token found');
          throw new Error('No authentication token');
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const response = await axios.get('http://localhost:8000/tutors/me/', { 
          headers,
          withCredentials: false // Disable credentials since we're using JWT
        });

        if (response.data && response.data.room_id) {
          console.log('Setting room ID from backend:', response.data.room_id);
          setRoomID(response.data.room_id.toString()); // Ensure room ID is a string
        } else {
          throw new Error('No room ID in response');
        }
      } catch (error) {
        console.error('Error fetching room ID:', error.response?.data || error.message);
        // If no valid room ID from backend, use URL params or generate one
        const urlParams = getUrlParams(window.location.href);
        const roomIdFromUrl = urlParams['roomID'];
        if (roomIdFromUrl && roomIdFromUrl !== 'null') {
          setRoomID(roomIdFromUrl);
        } else {
          const newRoomId = getRandomID();
          console.log('Generated new room ID after error:', newRoomId);
          setRoomID(newRoomId);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomID();
  }, []); // Empty dependency array since we're using ref to prevent duplicates

  useEffect(() => {
    try {
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      setLocalUserData(localUser);
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
    }
  }, []);
  
  // Always ensure we have valid values for ZegoCloud
  const userID = reduxUserId || (localUserData?.id) || localStorage.getItem('user_id') || getRandomID();
  
  // Format name as first_name + last_name to match dashboard
  const formatFullName = (userData) => {
    if (!userData) return null;
    
    // If both first and last name exist, concatenate them
    if (userData.first_name && userData.last_name) {
      return `${userData.first_name} ${userData.last_name}`;
    }
    // If only first name exists
    else if (userData.first_name) {
      return userData.first_name;
    }
    // If name field exists (some user objects might have a combined name field)
    else if (userData.name) {
      return userData.name;
    }
    return null;
  };
  
  // Use the tutor's name from multiple possible sources, in dashboard format
  const userName = formatFullName(user) || 
                  formatFullName(localUserData) || 
                  localStorage.getItem('user_name') || 
                  `Tutor-${userID}`;
  
  const [meetingNotes, setMeetingNotes] = useState('');
  const videoRef = useRef(null);
  const [emotion, setEmotion] = useState('Detecting...');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const [subtitlesVisible, setSubtitlesVisible] = useState(true);

  const startRecording = () => {
    recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      finalTranscriptRef.current += finalTranscript;
      setTranscript(finalTranscriptRef.current);
    };
    recognitionRef.current.start();
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      const transcriptToSend = finalTranscriptRef.current.trim();
      if (!transcriptToSend) {
        alert('Transcript is empty. Please try again.');
        return;
      }
      try {
        console.log('Final Transcript:', transcriptToSend);
        
        // Check if transcript is too short
        if (transcriptToSend.split(' ').length < 5) {
          console.log('Transcript too short, providing feedback to user');
          setMeetingNotes('**Recording Too Short**\n\n* Please speak for at least a few sentences to generate meaningful notes.\n* Try recording again with more content.');
          return;
        }
        
        // Show loading state
        setMeetingNotes('**Generating Notes...**\n\nPlease wait while we analyze your session...');
        
        // Get auth token from localStorage
        const token = localStorage.getItem('access_token');
        
        // Make API call with authentication headers if token exists
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // First, analyze the transcript
        const analysisResponse = await axios.post('http://localhost:8000/vidchat/analyze-transcript/', {
          transcript: transcriptToSend,
        }, { headers });
        
        console.log('AI Notes response:', analysisResponse.data);
        
        if (analysisResponse.data && analysisResponse.data.result) {
          // Use the sessionId prop to save notes
          if (sessionId) {
            // Format the AI-generated notes
            const formattedNotes = `AI Generated Notes:\n\n${analysisResponse.data.result}\n\n---\n\nTutor Notes:\n\n`;
            
            // Save notes to backend with session ID
            const notesResponse = await axios.post(`http://localhost:8000/notes/session/${sessionId}/manage/`, {
              content: formattedNotes,
              is_approved: false,
              tutor_notes: null
            }, { headers });
            
            console.log('Notes saved to backend:', notesResponse.data);
            setMeetingNotes(formattedNotes);
          } else {
            console.warn('No session ID provided, notes not saved to backend');
            setMeetingNotes(analysisResponse.data.result);
          }
        } else {
          setMeetingNotes('**Note Generation Failed**\n\n* Unable to generate notes from your recording.\n* Please try again with clearer speech.');
        }
      } catch (error) {
        console.error('Error generating meeting notes:', error);
        setMeetingNotes('**Error Generating Notes**\n\n* There was a problem processing your recording.\n* Please try again in a moment.');
      }
    }
  };

  // Use a ref to track if we've already joined a room
  const hasJoinedRoom = useRef(false);
  const zegoInstanceRef = useRef(null);
  
  const myMeeting = async (element) => {
    // Prevent joining the same room multiple times
    if (hasJoinedRoom.current) {
      console.log('Already joined a room, skipping duplicate join attempt');
      return;
    }
    
    // Match exactly the working example's parameters
    const appID = 1107019978;
    const serverSecret = '127d2f6d02d86b17d71284c585bb8b44';
    
    // Debug logging
    console.log('ZegoCloud debug:', { appID, serverSecret, roomID, userID, userName });
    
    try {
      // Generate kit token exactly as in the working example
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, roomID, userID, userName);
      
      // Create the ZegoUIKit instance
      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zegoInstanceRef.current = zp;
      
      // Mark that we've joined a room
      hasJoinedRoom.current = true;
      
      // Join the room with the exact same configuration as the working example
      zp.joinRoom({
        container: element,
        sharedLinks: [{
          name: 'Personal link',
          url: `${window.location.protocol}//${window.location.host}${window.location.pathname}?roomID=${roomID}`,
        }],
        scenario: {
          mode: ZegoUIKitPrebuilt.VideoConference,
        },
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: true,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: true,
        showTextChat: true,
        showUserList: true,
        maxUsers: 2,
        layout: "Auto",
        showLayoutButton: false,
      });
      const observer = new MutationObserver(() => {
        const footer = document.getElementById('ZegoRoomFooterMiddle');
        if (footer && !document.getElementById('recording-buttons')) {
          // Create a container for our custom buttons with original positioning
          const recordingButtons = document.createElement('div');
          recordingButtons.id = 'recording-buttons';
          recordingButtons.style.display = 'flex';
          recordingButtons.style.alignItems = 'center';
          recordingButtons.style.gap = '15px';
          const startButton = document.createElement('button');
          startButton.className = 'btn';
          startButton.style.height = "36px";
          startButton.style.minWidth = "100px";
          startButton.style.padding = "0 16px";
          startButton.style.margin = "0 4px";
          startButton.style.display = 'flex';
          startButton.style.justifyContent = 'center';
          startButton.style.alignItems = 'center';
          startButton.style.gap = '5px';
          startButton.style.backgroundColor = '#2563eb';
          startButton.style.color = 'white';
          startButton.style.fontSize = '14px';
          startButton.style.fontWeight = '500';
          startButton.style.border = 'none';
          startButton.style.borderRadius = '4px';
          startButton.style.cursor = 'pointer';
          startButton.innerHTML = '<span style="display:flex;align-items:center;"><span style="margin-right:8px;">AI</span><span>Notes</span></span>';
          startButton.onclick = () => {
            startRecording();
            startButton.style.display = 'none';
            stopButton.style.display = 'block';
          };
          const stopButton = document.createElement('button');
          stopButton.className = 'btn';
          stopButton.style.height = "36px";
          stopButton.style.minWidth = "100px";
          stopButton.style.padding = "0 16px";
          stopButton.style.margin = "0 4px";
          stopButton.style.display = 'none';
          stopButton.style.justifyContent = 'center';
          stopButton.style.alignItems = 'center';
          stopButton.style.gap = '5px';
          stopButton.style.backgroundColor = '#dc2626';
          stopButton.style.color = 'white';
          stopButton.style.fontSize = '14px';
          stopButton.style.fontWeight = '500';
          stopButton.style.border = 'none';
          stopButton.style.borderRadius = '4px';
          stopButton.style.cursor = 'pointer';
          stopButton.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;width:100%;">Stop</span>';
          stopButton.onclick = () => {
            stopRecording();
            stopButton.style.display = 'none';
            startButton.style.display = 'flex';
          };
          const subtitlesButton = document.createElement('button');
          subtitlesButton.className = 'btn';
          subtitlesButton.style.height = "36px";
          subtitlesButton.style.width = "60px";
          subtitlesButton.style.padding = "0";
          subtitlesButton.style.margin = "0 4px";
          subtitlesButton.style.display = 'flex';
          subtitlesButton.style.justifyContent = 'center';
          subtitlesButton.style.alignItems = 'center';
          subtitlesButton.style.backgroundColor = '#0ea5e9';
          subtitlesButton.style.color = 'white';
          subtitlesButton.style.fontSize = '14px';
          subtitlesButton.style.border = 'none';
          subtitlesButton.style.borderRadius = '4px';
          subtitlesButton.style.cursor = 'pointer';
          subtitlesButton.innerHTML = '<i class="fas fa-closed-captioning"></i>';
          subtitlesButton.onclick = () => {
            if (subtitlesVisible) {
              subtitlesButton.innerHTML = '<i class="fas fa-closed-captioning" style="opacity: 0.5;"></i>';
              subtitlesButton.style.backgroundColor = '#64748b';
            } else {
              subtitlesButton.innerHTML = '<i class="fas fa-closed-captioning"></i>';
              subtitlesButton.style.backgroundColor = '#0ea5e9';
            }
            setSubtitlesVisible((prev) => !prev);
          };
          const fullscreenButton = document.createElement('button');
          fullscreenButton.className = 'btn';
          fullscreenButton.style.height = "36px";
          fullscreenButton.style.width = "60px";
          fullscreenButton.style.padding = "0";
          fullscreenButton.style.margin = "0 4px";
          fullscreenButton.style.display = 'flex';
          fullscreenButton.style.justifyContent = 'center';
          fullscreenButton.style.alignItems = 'center';
          fullscreenButton.style.backgroundColor = '#374151';
          fullscreenButton.style.color = 'white';
          fullscreenButton.style.fontSize = '14px';
          fullscreenButton.style.border = 'none';
          fullscreenButton.style.borderRadius = '4px';
          fullscreenButton.style.cursor = 'pointer';
          fullscreenButton.innerHTML = '<i class="fas fa-expand" style="font-size:16px;"></i>';
          fullscreenButton.onclick = () => {
            const meetingContainer = document.querySelector('.myCallContainer');
            if (meetingContainer) {
              if (document.fullscreenElement) {
                document.exitFullscreen();
                fullscreenButton.innerHTML = '<i class="fas fa-expand" style="font-size: 20px;"></i>';
              } else {
                meetingContainer.requestFullscreen();
                fullscreenButton.innerHTML = '<i class="fas fa-compress" style="font-size: 20px;"></i>';
              }
            }
          };
          recordingButtons.appendChild(startButton);
          recordingButtons.appendChild(stopButton);
          recordingButtons.appendChild(subtitlesButton);
          recordingButtons.appendChild(fullscreenButton);
          footer.appendChild(recordingButtons);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    } catch (error) {
      console.error('Error joining ZegoCloud room:', error);
      hasJoinedRoom.current = false;
    }
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((error) => {
        console.error('Error accessing camera:', error);
        alert('Could not access the camera. Please allow camera access.');
      });
    const interval = setInterval(() => {
      captureFrame();
    }, 1000);
    
    // Cleanup function
    return () => {
      // Clear the emotion detection interval
      clearInterval(interval);
      
      // Clean up video stream
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      // Clean up speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Speech recognition already stopped');
        }
      }
      
      // Reset the joined room flag
      hasJoinedRoom.current = false;
    };
  }, []);

  const captureFrame = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('image', blob);
      try {
        const response = await axios.post('http://localhost:8000/vidchat/detect-emotion/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setEmotion(response.data.emotions[0] || 'No emotion detected');
      } catch (error) {
        console.error('Error detecting emotion:', error);
      }
    }, 'image/jpeg');
  };

  // Don't proceed with room creation until we have a valid roomID
  if (isLoading || !roomID) {
    return <div>Loading session...</div>;
  }

  return (
    <div className="container-fluid" style={{ height: '100%', width: '100%', padding: 0, overflow: 'hidden' }}>
      {/* Meeting Container */}
      <div className="myCallContainer" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} ref={myMeeting}></div>
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{
          visibility: 'hidden',
          zIndex: 0,
          width: '200px',
          height: '150px',
          position: 'absolute',
          top: '70px',
          right: '70px',
          border: '2px solid white',
        }}
      />
      {/* Emotion Display */}
      <h2
        style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          zIndex: 1000,
        }}
      >
        Emotion: {emotion}
      </h2>
      {/* Real-Time Transcript */}
      <div
        id="real-time-transcript"
        style={{
          display: subtitlesVisible ? 'block' : 'none',
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          maxWidth: '800px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          zIndex: 1000,
        }}
      >
        <h3 style={{ fontSize: '16px', marginBottom: '5px' }}>Real-Time Transcript:</h3>
        <p style={{ fontSize: '14px', maxHeight: '100px', overflowY: 'auto' }}>
          {transcript || 'No transcript available.'}
        </p>
      </div>
      
      {/* Meeting Notes */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '300px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        zIndex: 1000,
        display: meetingNotes ? 'block' : 'none'
      }}>
        <h3 style={{ fontSize: '16px', marginBottom: '5px' }}>Meeting Notes</h3>
        <div style={{ fontSize: '14px', maxHeight: '200px', overflowY: 'auto' }}>
          {meetingNotes || 'No notes generated yet.'}
        </div>
      </div>
    </div>
  );
} 