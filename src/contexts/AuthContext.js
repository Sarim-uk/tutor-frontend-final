import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  refreshToken as apiRefreshToken, 
  getSessionUser, 
  isSessionValid, 
  saveUserSession, 
  clearUserSession, 
  logoutUser 
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getSessionUser());
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Check token validity on mount and set up periodic token refresh
  useEffect(() => {
    const validateSession = async () => {
      try {
        setLoading(true);
        
        // Check if we have a valid token
        if (!isSessionValid()) {
          setUser(null);
          setLoading(false);
          setInitialized(true);
          return;
        }

        // Get the current user from localStorage
        const currentUser = getSessionUser();
        if (!currentUser) {
          clearUserSession();
          setUser(null);
          setLoading(false);
          setInitialized(true);
          return;
        }

        // Check if token is about to expire and refresh if needed
        try {
          const token = localStorage.getItem('access_token');
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          const expiry = tokenData.exp * 1000;
          
          // If token expires in less than 1 hour, refresh it
          const oneHour = 60 * 60 * 1000;
          if (Date.now() + oneHour >= expiry) {
            console.log('Token will expire soon, refreshing...');
            const newTokens = await apiRefreshToken();
            if (!newTokens) {
              throw new Error('Failed to refresh token');
            }
          }
          
          // Revalidate user data
          setUser(currentUser);
        } catch (error) {
          console.error('Session validation error:', error);
          clearUserSession();
          setUser(null);
        }
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    validateSession();

    // Set up token refresh interval (every 6 hours)
    const refreshInterval = setInterval(async () => {
      if (isSessionValid()) {
        try {
          await apiRefreshToken();
        } catch (error) {
          console.error('Auto token refresh failed:', error);
          // Don't logout here - we'll let the request interceptor handle expired tokens
        }
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const login = (userData, tokens) => {
    if (!userData || !tokens) {
      console.error('Invalid login data');
      return;
    }
    
    // Validate role - only allow tutors/teachers
    if (userData.role !== 'tutor' && userData.role !== 'teacher') {
      console.error('Invalid user role:', userData.role);
      return;
    }
    
    // Standardize the user data format
    const standardizedUserData = {
      ...userData,
      // Ensure firstName and lastName are present
      firstName: userData.firstName || userData.first_name || '',
      lastName: userData.lastName || userData.last_name || ''
    };
    
    // Save session data
    saveUserSession(standardizedUserData, tokens);
    
    // Update context state
    setUser(standardizedUserData);
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  // Auto-refresh token when user is inactive for a while then returns
  useEffect(() => {
    let visibilityTimeout;
    
    const handleVisibilityChange = async () => {
      // When tab becomes visible again after being hidden
      if (!document.hidden && isSessionValid() && user) {
        clearTimeout(visibilityTimeout);
        
        visibilityTimeout = setTimeout(async () => {
          try {
            await apiRefreshToken();
          } catch (error) {
            console.error('Visibility token refresh failed:', error);
          }
        }, 1000); // Small delay to prevent multiple refreshes
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(visibilityTimeout);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, initialized }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 