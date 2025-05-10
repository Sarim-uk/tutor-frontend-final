import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Profile from './components/Profile';
import TutoringSession from './components/TutoringSession';
import { login as reduxLogin } from './redux/authSlice';
import { getSessionUser } from './services/api';
import AssignmentForm from './components/assignment/AssignmentForm';
import SubmissionReview from './components/assignment/SubmissionReview';

// Component to sync Auth context with Redux
const AuthSync = () => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    // On mount, check if we have a user in session and update Redux
    const sessionUser = getSessionUser();
    if (sessionUser) {
      dispatch(reduxLogin(sessionUser));
    }
  }, [dispatch]);
  
  return null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AuthSync />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Video Room route - using TutoringSession component */}
            <Route path="/room" element={
              <ProtectedRoute>
                <TutoringSession />
              </ProtectedRoute>
            } />
            
            {/* Other Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/students" element={
              <ProtectedRoute>
                <Students />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* Assignment routes */}
            <Route path="/assignments/create" element={
              <ProtectedRoute>
                <AssignmentForm />
              </ProtectedRoute>
            } />
            
            <Route path="/assignments/edit/:id" element={
              <ProtectedRoute>
                <AssignmentForm />
              </ProtectedRoute>
            } />
            
            {/* Deprecated - now handled via modal, but keeping for backward compatibility */}
            <Route path="/assignments/:id/submissions" element={
              <ProtectedRoute>
                <Navigate to="/assignments" replace />
              </ProtectedRoute>
            } />
            
            {/* Redirect root to dashboard if logged in, otherwise to login */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all unmatched routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 