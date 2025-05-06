import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Role-based route component that restricts access based on user role
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Array of roles allowed to access the route
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {string} [props.redirectPath] - Path to redirect to if unauthorized
 */
const RoleBasedRoute = ({ allowedRoles, children, redirectPath }) => {
  const { user, isAuthenticated } = useAuth();
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If user doesn't have the required role, redirect
  if (!allowedRoles.includes(user?.role?.toLowerCase())) {
    // Redirect to appropriate dashboard based on role
    if (user?.role?.toLowerCase() === 'student') {
      return <Navigate to="/student/dashboard" replace />;
    } else if (user?.role?.toLowerCase() === 'tutor' || user?.role?.toLowerCase() === 'teacher') {
      return <Navigate to="/dashboard" replace />;
    } else {
      // Default redirect path if specified, or fallback to login
      return <Navigate to={redirectPath || "/login"} replace />;
    }
  }
  
  // User is authenticated and has the required role
  return children;
};

export default RoleBasedRoute; 