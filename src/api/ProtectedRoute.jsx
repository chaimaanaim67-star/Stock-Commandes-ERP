import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // Kan-jibo l-user men l-localStorage (li ghadi n-7etto fih l-data mni i-login)
  const user = JSON.parse(localStorage.getItem('user'));

  // Ila makanch l-user ga3, rj3ih l-Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to="/login" replace />;

  // Ila kolshi mzyan, khallih i-shouf l-page (children)
  return children;
};

export default ProtectedRoute;