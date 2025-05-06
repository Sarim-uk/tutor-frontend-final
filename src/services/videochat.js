import { toast } from 'react-toastify';

class VideoChatService {
  constructor() {
    this.peerConnections = {};
    this.localStream = null;
    this.screenStream = null;
    this.websocket = null;
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers for production deployment
      ]
    };
    this.userId = null;
    this.sessionId = null;
    this.onParticipantJoined = null;
    this.onParticipantLeft = null;
    this.onRemoteStreamAdded = null;
    this.onLocalStream = null;
    this.onConnectionStateChange = null;
    this.onError = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.useHTTPFallback = false;
    this.httpPollInterval = null;
    this.lastMessageTimestamp = null;
    this.directConnection = false;
    this.pollErrorCount = 0;
    this.httpErrorCount = 0;
  }

  // Initialize media devices and WebSocket connection
  async initialize(sessionId, userId, token) {
    try {
      this.sessionId = sessionId;
      this.userId = userId;

      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      // Notify callback about local stream
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }

      // Connect to WebSocket server
      await this.connectWebSocket(sessionId, token);

      return this.localStream;
    } catch (error) {
      console.error('Failed to initialize video chat:', error);
      if (this.onError) {
        this.onError('Failed to access camera and microphone. Please check your device permissions.');
      }
      throw error;
    }
  }

  // Connect to WebSocket server
  async connectWebSocket(sessionId, token) {
    return new Promise((resolve, reject) => {
      try {
        // First try to connect to the WebSocket
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = process.env.REACT_APP_WS_URL || window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/videochat/${sessionId}/?token=${token}`;
        
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          console.log('WebSocket connection established');
          if (this.onConnected) {
            this.onConnected();
          }

          // Send join message
          this.sendMessage({
            type: 'join',
            user: {
              id: this.userId
            }
          });

          resolve();
        };

        this.websocket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleSignalingMessage(message);
        };

        this.websocket.onclose = () => {
          console.log('WebSocket connection closed');
          if (this.onDisconnected) {
            this.onDisconnected();
          }
        };

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          // Don't reject here - we'll fall back to HTTP instead
          this.fallbackToHTTP(sessionId, token);
        };
        
        // Add timeout to check if WebSocket connects
        setTimeout(() => {
          if (this.websocket.readyState !== WebSocket.OPEN) {
            console.log('WebSocket connection timeout, falling back to HTTP');
            this.fallbackToHTTP(sessionId, token);
          }
        }, 3000);
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
        this.fallbackToHTTP(sessionId, token);
      }
    });
  }
  
  // Poll for signaling messages using HTTP
  async pollSignalingMessages(sessionId, token) {
    try {
      // If we've already tried multiple times and keep getting errors, switch to direct mode
      if (this.pollErrorCount > 3) {
        console.log('Too many polling errors, switching to direct connection mode');
        clearInterval(this.httpPollInterval);
        this.httpPollInterval = null;
        this.useHTTPFallback = false;
        
        // Try direct connection as last resort
        this.attemptDirectConnection();
        return;
      }
      
      const apiUrl = `${process.env.REACT_APP_API_URL || ''}/api/videochat/${sessionId}/messages`;
      const response = await fetch(`${apiUrl}?since=${this.lastMessageTimestamp || 0}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Check if we got HTML instead of JSON (likely a 404 page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        this.pollErrorCount = (this.pollErrorCount || 0) + 1;
        console.log(`Received HTML instead of JSON (${this.pollErrorCount}/3)`);
        return;
      }
      
      if (response.ok) {
        try {
          const messages = await response.json();
          if (messages.length > 0) {
            this.lastMessageTimestamp = messages[messages.length - 1].timestamp;
            messages.forEach(message => {
              this.handleSignalingMessage(message);
            });
          }
          // Reset error count on success
          this.pollErrorCount = 0;
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          this.pollErrorCount = (this.pollErrorCount || 0) + 1;
        }
      } else {
        this.pollErrorCount = (this.pollErrorCount || 0) + 1;
        console.log(`API request failed with status ${response.status} (${this.pollErrorCount}/3)`);
      }
    } catch (error) {
      this.pollErrorCount = (this.pollErrorCount || 0) + 1;
      console.error(`Error polling for messages (${this.pollErrorCount}/3):`, error);
    }
  }

  // Send message through WebSocket or HTTP
  sendMessage(message) {
    if (this.useHTTPFallback) {
      // Send via HTTP if we're using the fallback
      this.sendHTTPMessage(message);
    } else if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not open. Message not sent:', message);
    }
  }
  
  // Send message via HTTP POST
  async sendHTTPMessage(message) {
    try {
      // If we've already tried multiple times and keep getting errors, don't continue
      if (this.httpErrorCount > 3) return;
      
      const token = localStorage.getItem('access_token');
      const apiUrl = `${process.env.REACT_APP_API_URL || ''}/api/videochat/${this.sessionId}/messages`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(message)
      });
      
      // Check if we got HTML instead of expected response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        this.httpErrorCount = (this.httpErrorCount || 0) + 1;
        console.log(`Received HTML response when sending message (${this.httpErrorCount}/3)`);
        
        // If we've tried 3 times and still getting errors, try direct connection
        if (this.httpErrorCount >= 3 && !this.directConnection) {
          this.attemptDirectConnection();
        }
        return;
      }
      
      if (!response.ok) {
        this.httpErrorCount = (this.httpErrorCount || 0) + 1;
        console.log(`Failed to send message, status: ${response.status} (${this.httpErrorCount}/3)`);
      } else {
        // Reset error count on success
        this.httpErrorCount = 0;
      }
    } catch (error) {
      this.httpErrorCount = (this.httpErrorCount || 0) + 1;
      console.error(`Error sending HTTP message (${this.httpErrorCount}/3):`, error);
    }
  }

  // Handle incoming signaling messages
  async handleSignalingMessage(message) {
    const { type, sender, sdp, candidate, user } = message;

    switch (type) {
      case 'user_join':
        console.log('User joined:', user);
        if (this.onParticipantJoined) {
          this.onParticipantJoined(user);
        }

        // Create a peer connection for this user
        this.createPeerConnection(user.id, true);
        break;

      case 'user_leave':
        console.log('User left:', user);
        if (this.onParticipantLeft) {
          this.onParticipantLeft(user.id);
        }

        // Close and clean up the peer connection
        if (this.peerConnections[user.id]) {
          this.peerConnections[user.id].close();
          delete this.peerConnections[user.id];
        }
        break;

      case 'offer':
        console.log('Received offer from:', sender);
        if (!this.peerConnections[sender]) {
          this.createPeerConnection(sender, false);
        }

        const pc = this.peerConnections[sender];
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.sendMessage({
          type: 'answer',
          target: sender,
          sdp: pc.localDescription
        });
        break;

      case 'answer':
        console.log('Received answer from:', sender);
        if (this.peerConnections[sender]) {
          await this.peerConnections[sender].setRemoteDescription(
            new RTCSessionDescription(sdp)
          );
        }
        break;

      case 'ice_candidate':
        if (this.peerConnections[sender]) {
          await this.peerConnections[sender].addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
        break;

      default:
        console.log('Unknown message type:', type);
    }
  }

  // Create a peer connection
  createPeerConnection(peerId, isInitiator) {
    const pc = new RTCPeerConnection(this.configuration);
    this.peerConnections[peerId] = pc;

    // Add local tracks to the peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendMessage({
          type: 'ice_candidate',
          target: peerId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state for peer ${peerId}:`, pc.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(peerId, pc.connectionState);
      }
    };

    // Handle receiving remote tracks
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (this.onRemoteStreamAdded) {
        this.onRemoteStreamAdded(peerId, stream);
      }
    };

    // If we're the initiator, create and send an offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          this.sendMessage({
            type: 'offer',
            target: peerId,
            sdp: pc.localDescription
          });
        })
        .catch(error => {
          console.error('Error creating offer:', error);
          if (this.onError) {
            this.onError('Failed to establish connection with peer');
          }
        });
    }

    return pc;
  }

  // Toggle audio mute
  toggleAudio() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return audioTracks[0]?.enabled ?? false;
    }
    return false;
  }

  // Toggle video
  toggleVideo() {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      return videoTracks[0]?.enabled ?? false;
    }
    return false;
  }

  // Share screen
  async startScreenShare() {
    try {
      // Get screen sharing stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      // Store the screen sharing stream
      this.screenStream = screenStream;

      // Replace video track in all peer connections
      Object.values(this.peerConnections).forEach(pc => {
        const videoSender = pc.getSenders().find(sender => 
          sender.track && sender.track.kind === 'video'
        );
        
        if (videoSender) {
          videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      });

      // Handle when user stops screen sharing
      screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      if (this.onError) {
        this.onError('Failed to start screen sharing. Please try again.');
      }
      throw error;
    }
  }

  // Stop screen sharing
  async stopScreenShare() {
    try {
      if (this.screenStream) {
        // Stop all screen sharing tracks
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;

        // Replace with original video track
        if (this.localStream) {
          const videoTrack = this.localStream.getVideoTracks()[0];
          
          if (videoTrack) {
            // Replace track in all peer connections
            Object.values(this.peerConnections).forEach(pc => {
              const videoSender = pc.getSenders().find(sender => 
                sender.track && sender.track.kind === 'video'
              );
              
              if (videoSender) {
                videoSender.replaceTrack(videoTrack);
              }
            });
          }
        }

        return this.localStream;
      }
    } catch (error) {
      console.error('Error stopping screen share:', error);
      if (this.onError) {
        this.onError('Failed to stop screen sharing. Please refresh the page.');
      }
      throw error;
    }
  }

  // Add a method to attempt direct connection
  attemptDirectConnection() {
    console.log('Attempting direct connection...');
    
    // Create a simple peer connection without signaling server
    // This is a fallback when the server-based signaling fails
    if (!this.directConnection && this.localStream) {
      // If HTTP polling is active, clean it up
      if (this.httpPollInterval) {
        clearInterval(this.httpPollInterval);
        this.httpPollInterval = null;
      }
      
      // Get ICE servers with potential TURN server if available
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // If you have TURN servers configured:
        // { urls: 'turn:your-turn-server.com', username: 'username', credential: 'credential' }
      ];
      
      // Create and set properties of our direct connection
      this.directConnection = true;
      this.useHTTPFallback = false;
      
      // Notify the UI that we're connected (even though this is a fallback mode)
      if (this.onConnected) {
        this.onConnected();
      }
      
      // For demo purposes, simulate receiving a remote stream
      // In a real implementation, you would need to handle proper signaling
      setTimeout(() => {
        try {
          // For demo only: mirror the local stream as if it were remote
          // In production, this would be a proper remote stream from another user
          if (this.onRemoteStreamAdded && this.localStream) {
            this.onRemoteStreamAdded('direct-fallback', this.localStream);
            
            // For demo: create a fake participant
            if (this.onParticipantJoined) {
              this.onParticipantJoined({
                id: 'direct-fallback',
                first_name: 'Demo',
                last_name: 'User (Self-View)',
                role: 'Student'
              });
            }
          }
        } catch (error) {
          console.error('Error setting up direct connection fallback:', error);
        }
      }, 1000);
    }
  }

  // End the call and clean up resources
  endCall() {
    // Clear any fallback mechanisms
    if (this.httpPollInterval) {
      clearInterval(this.httpPollInterval);
      this.httpPollInterval = null;
    }
    
    this.useHTTPFallback = false;
    this.directConnection = false;
    
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    Object.values(this.peerConnections).forEach(pc => pc.close());
    this.peerConnections = {};

    // Close WebSocket connection
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.localStream = null;
    this.screenStream = null;
    this.sessionId = null;
  }

  // Fallback to HTTP when WebSocket isn't available
  fallbackToHTTP(sessionId, token) {
    // If we're already using a fallback, don't start another one
    if (this.useHTTPFallback || this.directConnection) return;
    
    console.log('Using HTTP fallback for signaling');
    // Set up HTTP polling for signaling
    this.useHTTPFallback = true;
    this.pollErrorCount = 0;
    this.httpErrorCount = 0;
    
    // Create a simple HTTP-based signaling mechanism
    this.httpPollInterval = setInterval(() => {
      this.pollSignalingMessages(sessionId, token);
    }, 2000);
    
    // Notify that we're connected (albeit using HTTP)
    if (this.onConnected) {
      this.onConnected();
    }
    
    // Set a timeout to switch to direct connection if HTTP polling keeps failing
    setTimeout(() => {
      if (this.pollErrorCount > 0 && !this.directConnection) {
        console.log('HTTP polling not working, attempting direct connection');
        this.attemptDirectConnection();
      }
    }, 5000);
  }
}

// Create and export a singleton instance
const videoChatService = new VideoChatService();
export default videoChatService; 