import { configureStore } from '@reduxjs/toolkit';
import authSlice from './authSlice'; // Import your authSlice

const store = configureStore({
  reducer: {
    auth: authSlice, // Add your slice here
  },
});

export default store;
