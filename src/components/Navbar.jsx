// src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Divider,
  ListItemIcon,
  Dialog,
} from '@mui/material';
import {
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';
import Profile from './Profile';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, getSessionUser } from '../services/api';

function Navbar() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  // Get user from both Redux and Auth context for redundancy
  const reduxUser = useSelector(state => state.auth.user);
  const { user: authUser, logout: authLogout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Ensure we have user data from either source
  const user = authUser || reduxUser || getSessionUser();

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.userId && !user?.id) return;

      try {
        const token = localStorage.getItem('access_token');
        const userId = user?.userId || user?.id;
        const response = await fetch(`${API_BASE_URL}/users/${userId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    setProfileOpen(true);
    handleClose();
  };

  const handleLogout = () => {
    dispatch(logout());
    authLogout();
    handleClose();
  };

  // Get the user's name, first trying from our state, then from user object
  const getUserName = () => {
    if (profileData?.first_name && profileData?.last_name) {
      return `${profileData.first_name} ${profileData.last_name}`;
    }
    
    const firstName = user?.firstName || user?.first_name || '';
    const lastName = user?.lastName || user?.last_name || '';
    
    if (!firstName && !lastName) return 'User Profile';
    return `${firstName} ${lastName}`;
  };

  const getAvatarUrl = () => {
    if (profileData?.profile_picture_url) {
      return `${API_BASE_URL}${profileData.profile_picture_url}`;
    }
    // Get user name for avatar, ensuring we don't pass "undefined undefined"
    const userName = getUserName().trim() || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
  };

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Teacher Nexus
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1">
              {getUserName()}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar
                src={getAvatarUrl()}
                alt={getUserName()}
                sx={{ width: 40, height: 40 }}
              />
            </IconButton>
          </Box>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle1">{getUserName()}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleProfile}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Profile Dialog */}
      <Dialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <Profile onClose={() => setProfileOpen(false)} />
      </Dialog>
    </>
  );
}

export default Navbar;