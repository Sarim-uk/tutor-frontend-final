import { createSlice } from '@reduxjs/toolkit';

// Function to get user data from localStorage
const getUserFromStorage = () => {
  try {
    const userString = localStorage.getItem('user');
    if (!userString) return null;
    
    const userData = JSON.parse(userString);
    return userData;
  } catch (error) {
    console.error('Error loading user from storage:', error);
    return null;
  }
};

const initialState = {
  user: getUserFromStorage(),
  isAuthenticated: !!getUserFromStorage(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
  },
});

export const { login, logout, updateUser } = authSlice.actions;
export default authSlice.reducer; 