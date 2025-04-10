import { createContext, useContext, useState, useEffect } from 'react';
import { loginStudent, loginTeacher, loginAdmin } from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for user in localStorage on page load
    const storedUser = localStorage.getItem('user');
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
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userToken', userData.token);
      
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const teacherLogin = async (id, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await loginTeacher(id, password);
      const userData = response.data;
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userToken', userData.token);
      
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userToken', userData.token);
      
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
    localStorage.removeItem('user');
    localStorage.removeItem('userToken');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    error,
    studentLogin,
    teacherLogin,
    adminLogin,
    logout,
    isAuthenticated: !!currentUser,
    isStudent: currentUser?.role === 'student',
    isTeacher: currentUser?.role === 'teacher',
    isAdmin: currentUser?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 