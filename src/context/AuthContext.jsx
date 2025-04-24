import { createContext, useContext, useState, useEffect } from 'react';
import { loginStudent, loginTeacher, loginAdmin, setupTeacherPassword as apiSetupTeacherPassword } from '../api';
import config from '../config/environment';

const AuthContext = createContext();

// Separate the hook from the provider to fix Fast Refresh issues
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the hook separately
export { useAuth };

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for user in localStorage on page load
    const storedUser = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Login handlers
  const studentLogin = async (id, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await loginStudent(id, password);
      const userData = response.data;
      
      localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(userData));
      localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, userData.token);
      
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const teacherLogin = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await loginTeacher(email, password);
      const userData = response.data;
      
      localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(userData));
      localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, userData.token);
      
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setupTeacherPassword = async (email, currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiSetupTeacherPassword(email, currentPassword, newPassword);
      const userData = response.data;
      
      // Update user data and token
      localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(userData));
      localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, userData.token);
      
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      setError(err.response?.data?.message || 'Password setup failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await loginAdmin(username, password);
      const userData = response.data;
      
      localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(userData));
      localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, userData.token);
      
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(config.AUTH.CURRENT_USER_KEY);
    localStorage.removeItem(config.AUTH.TOKEN_STORAGE_KEY);
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    error,
    studentLogin,
    teacherLogin,
    adminLogin,
    setupTeacherPassword,
    logout,
    isAuthenticated: !!currentUser,
    isStudent: currentUser?.role === 'student',
    isTeacher: currentUser?.role === 'teacher',
    isAdmin: currentUser?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 