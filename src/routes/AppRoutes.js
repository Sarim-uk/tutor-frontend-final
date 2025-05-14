import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';
import PrivateRoute from './PrivateRoute';
import Profile from '../components/Profile';
import Students from '../components/Students';
import NotFound from '../components/NotFound';
import StudentPerformanceAssessment from '../pages/StudentPerformanceAssessment';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={<Login />} 
      />
      
      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/students"
        element={
          <PrivateRoute>
            <Students />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/student-performance"
        element={
          <PrivateRoute>
            <StudentPerformanceAssessment />
          </PrivateRoute>
        }
      />
      
      {/* Redirect root to login */}
      <Route 
        path="/" 
        element={<Navigate to="/login" replace />} 
      />
      
      {/* 404 route */}
      <Route 
        path="*" 
        element={<NotFound />} 
      />
    </Routes>
  );
}

export default AppRoutes; 