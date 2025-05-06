import { createSlice } from '@reduxjs/toolkit';

// Initial state for authentication
const initialState = {
  isAuthenticated: !!localStorage.getItem('access_token'),
  user: JSON.parse(localStorage.getItem('user')) || null,
  tokens: {
    access: localStorage.getItem('access_token') || null,
    refresh: localStorage.getItem('refresh_token') || null,
  },
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.tokens = {
        access: localStorage.getItem('access_token'),
        refresh: localStorage.getItem('refresh_token'),
      };
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.tokens = {
        access: null,
        refresh: null,
      };
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    },
    updateTokens: (state, action) => {
      state.tokens = action.payload;
      localStorage.setItem('access_token', action.payload.access);
      localStorage.setItem('refresh_token', action.payload.refresh);
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
  },
});

// Export actions to use in your components
export const { login, logout, updateTokens, updateUser } = authSlice.actions;

// Export the reducer to include in the store
export default authSlice.reducer;
