import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import { APP_ID, APP_SIGN } from '../config/zegoCloud';
import { toast } from 'react-toastify';

class ZegoCloudService {
  constructor() {
    this.zg = null;
    this.localStream = null;
    this.remoteStreams = {};
    this.roomID = null;
    this.userID = null;
    this.userName = null;
    this.isPublishing = false;
    
    // Callbacks
    this.onRoomUserUpdate = null;
    this.onRoomStreamUpdate = null;
    this.onError = null;
    this.onConnectionStateChanged = null;
    this.onRemoteStreamAdded = null;
    this.onLocalStream = null;
  }

  // Initialize the ZegoCloud SDK
  async initialize(userId, userName) {
    if (!userId) {
      throw new Error('User ID is required for initialization');
    }

    this.userID = userId;
    this.userName = userName || `User-${userId}`;

    try {
      // Create ZegoExpressEngine instance
      this.zg = new ZegoExpressEngine(APP_ID, APP_SIGN);
      
      // Register callback events
      this.registerCallbacks();
      
      console.log('ZegoCloudService initialized');
      return true;
    } catch (error) {
      console.error('ZegoCloudService initialization failed:', error);
      if (this.onError) this.onError(error.message);
      return false;
    }
  }

  // Register necessary callbacks
  registerCallbacks() {
    if (!this.zg) return;

    // Room state callbacks
    this.zg.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
      console.log('Room state update:', roomID, state, errorCode, extendedData);
      if (this.onConnectionStateChanged) {
        this.onConnectionStateChanged(state);
      }
      
      if (state === 'DISCONNECTED' && errorCode !== 0) {
        if (this.onError) this.onError(`Room connection error: ${errorCode}`);
      }
    });

    // Room user update callback
    this.zg.on('roomUserUpdate', (roomID, updateType, userList) => {
      console.log('Room user update:', roomID, updateType, userList);
      if (this.onRoomUserUpdate) {
        this.onRoomUserUpdate(roomID, updateType, userList);
      }
    });

    // Room stream update callback
    this.zg.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData) => {
      console.log('Room stream update:', roomID, updateType, streamList, extendedData);
      
      if (this.onRoomStreamUpdate) {
        this.onRoomStreamUpdate(roomID, updateType, streamList);
      }

      // Handle added streams
      if (updateType === 'ADD') {
        for (const stream of streamList) {
          try {
            // Play the remote stream
            const remoteStream = await this.zg.startPlayingStream(stream.streamID);
            this.remoteStreams[stream.streamID] = remoteStream;
            
            if (this.onRemoteStreamAdded) {
              this.onRemoteStreamAdded(stream.user.userID, remoteStream, stream);
            }
          } catch (err) {
            console.error('Failed to play remote stream:', err);
            if (this.onError) this.onError(`Failed to play remote stream: ${err.message}`);
          }
        }
      } else if (updateType === 'DELETE') {
        // Handle removed streams
        for (const stream of streamList) {
          if (this.remoteStreams[stream.streamID]) {
            this.zg.stopPlayingStream(stream.streamID);
            delete this.remoteStreams[stream.streamID];
          }
        }
      }
    });

    // Publishing state callback
    this.zg.on('publisherStateUpdate', (result) => {
      console.log('Publisher state update:', result);
      this.isPublishing = result.state === 'PUBLISHING';
    });

    // Player state callback
    this.zg.on('playerStateUpdate', (result) => {
      console.log('Player state update:', result);
    });
  }

  // Join a room
  async joinRoom(roomID) {
    if (!this.zg) {
      throw new Error('ZegoCloud service not initialized');
    }

    if (!roomID) {
      throw new Error('Room ID is required to join a room');
    }

    this.roomID = roomID;

    try {
      // Join the room
      await this.zg.loginRoom(roomID, '', {
        userID: this.userID,
        userName: this.userName
      });
      
      console.log('Joined room:', roomID);
      return true;
    } catch (error) {
      console.error('Failed to join room:', error);
      if (this.onError) this.onError(`Failed to join room: ${error.message}`);
      return false;
    }
  }

  // Start local stream
  async startLocalStream(config = { video: true, audio: true }) {
    if (!this.zg) {
      throw new Error('ZegoCloud service not initialized');
    }

    try {
      // Create local stream
      this.localStream = await this.zg.createStream({
        camera: {
          video: config.video,
          audio: config.audio
        }
      });
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }
      
      return this.localStream;
    } catch (error) {
      console.error('Failed to create local stream:', error);
      if (this.onError) this.onError(`Failed to access camera/microphone: ${error.message}`);
      return null;
    }
  }

  // Publish local stream
  async publishStream() {
    if (!this.zg || !this.localStream) {
      throw new Error('ZegoCloud service not initialized or local stream not created');
    }

    if (!this.roomID) {
      throw new Error('Not in a room. Join a room first');
    }

    try {
      const streamID = `${this.roomID}-${this.userID}`;
      await this.zg.startPublishingStream(streamID, this.localStream);
      console.log('Started publishing stream:', streamID);
      return streamID;
    } catch (error) {
      console.error('Failed to publish stream:', error);
      if (this.onError) this.onError(`Failed to publish stream: ${error.message}`);
      return null;
    }
  }

  // Mute/unmute audio
  async muteAudio(mute) {
    if (!this.localStream) return false;
    
    try {
      this.localStream.muteAudio(mute);
      return true;
    } catch (error) {
      console.error('Failed to mute audio:', error);
      return false;
    }
  }

  // Enable/disable video
  async muteVideo(mute) {
    if (!this.localStream) return false;
    
    try {
      this.localStream.muteVideo(mute);
      return true;
    } catch (error) {
      console.error('Failed to mute video:', error);
      return false;
    }
  }

  // Screen sharing
  async startScreenSharing() {
    if (!this.zg) {
      throw new Error('ZegoCloud service not initialized');
    }

    if (!this.roomID) {
      throw new Error('Not in a room. Join a room first');
    }

    try {
      const screenStream = await this.zg.createStream({
        screen: { audio: true, video: true }
      });
      
      const screenStreamID = `${this.roomID}-${this.userID}-screen`;
      await this.zg.startPublishingStream(screenStreamID, screenStream);
      
      return screenStream;
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      if (this.onError) this.onError(`Failed to start screen sharing: ${error.message}`);
      return null;
    }
  }

  // Stop screen sharing
  async stopScreenSharing(screenStream, screenStreamID) {
    if (!this.zg || !screenStream) return;
    
    try {
      this.zg.stopPublishingStream(screenStreamID);
      screenStream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
    }
  }

  // Create a new session room
  async createSession(sessionName) {
    if (!this.userID) {
      throw new Error('User ID is required to create a session');
    }
    
    // Generate a unique room ID for the session
    // In a real app, this ID should be stored in your backend
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    return {
      id: sessionId, 
      name: sessionName,
      creator: this.userID,
      createdAt: new Date().toISOString()
    };
  }

  // Leave the room
  async leaveRoom() {
    if (!this.zg || !this.roomID) return;
    
    try {
      // Stop publishing local stream
      const streamID = `${this.roomID}-${this.userID}`;
      this.zg.stopPublishingStream(streamID);
      
      // Stop all remote streams
      Object.keys(this.remoteStreams).forEach(streamID => {
        this.zg.stopPlayingStream(streamID);
      });
      
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      // Logout from the room
      await this.zg.logoutRoom(this.roomID);
      
      // Reset state
      this.remoteStreams = {};
      this.roomID = null;
      this.isPublishing = false;
      
      console.log('Left room successfully');
    } catch (error) {
      console.error('Failed to leave room properly:', error);
    }
  }

  // Complete cleanup
  destroy() {
    this.leaveRoom();
    
    if (this.zg) {
      // Destroy the ZegoExpressEngine instance
      this.zg.off('roomStateUpdate');
      this.zg.off('roomUserUpdate');
      this.zg.off('roomStreamUpdate');
      this.zg.off('publisherStateUpdate');
      this.zg.off('playerStateUpdate');
      
      this.zg = null;
    }
    
    this.userID = null;
    this.userName = null;
    
    console.log('ZegoCloud service destroyed');
  }
}

const zegoCloudService = new ZegoCloudService();
export default zegoCloudService; 