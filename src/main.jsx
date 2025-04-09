import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx';
import LoginForm from './components/LoginForm.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import './index.css';

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Redirect based on role
    if (currentUser.role === 'student') {
      return <Navigate to="/student/dashboard" replace />;
    } else if (currentUser.role === 'teacher') {
      return <Navigate to="/teacher/dashboard" replace />;
    } else if (currentUser.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // Default fallback
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route 
            path="/student/*" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <App />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher/*" 
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <App />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <App />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
); 