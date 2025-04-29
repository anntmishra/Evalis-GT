import axios from 'axios';
import { Teacher } from '../types/university';
import config from '../config/environment';

const API_URL = config.API_ENDPOINTS.TEACHERS.BASE;

// Get token from storage
const getToken = () => {
  // First try the main token storage
  let token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  
  // If not found, check if we have a currentUser with token
  if (!token) {
    const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user && user.token) {
          token = user.token;
          console.log('Found token in currentUser object');
          
          // Update the main token storage for future requests
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, user.token);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }
  
  return token;
};

// Check if session is valid and try to recover if possible
export const checkSessionValidity = async (): Promise<boolean> => {
  const token = getToken();
  if (!token) {
    console.warn('No token found, session is invalid');
    return false;
  }
  
  try {
    // Make a lightweight API call to check if the token is still valid
    const response = await axios.get(
      `${config.API_ENDPOINTS.AUTH}/status`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (response.status === 200) {
      console.log('Session is valid');
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('Session validation failed:', error);
    return false;
  }
};

// Create a silent session recovery function
export const attemptSessionRecovery = async (): Promise<boolean> => {
  console.log('Attempting silent session recovery...');
  
  const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
  if (!userData) {
    console.warn('No user data found for recovery');
    return false;
  }
  
  try {
    const user = JSON.parse(userData);
    
    // If we have a stored refresh token, try to use it
    if (user.refreshToken) {
      console.log('Found refresh token, attempting refresh');
      try {
        const response = await axios.post(
          `${config.API_ENDPOINTS.AUTH}/refresh`,
          { refreshToken: user.refreshToken }
        );
        
        if (response.status === 200 && response.data.token) {
          // Update tokens
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, response.data.token);
          
          // Update user object
          user.token = response.data.token;
          if (response.data.refreshToken) {
            user.refreshToken = response.data.refreshToken;
          }
          
          localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify(user));
          console.log('Session refreshed successfully');
          return true;
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error during session recovery:', error);
    return false;
  }
};

// Set auth header with improved error handling
const authConfig = () => {
  const token = getToken();
  if (!token) {
    console.warn('No authentication token found');
    
    // Try to get the token from other storage locations
    const userToken = localStorage.getItem('userToken');
    const currentUser = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
    
    console.log('Alternative token sources checked:');
    console.log('- userToken:', !!userToken);
    console.log('- currentUser:', !!currentUser);
    
    // If we found a user but no token, that's a sign of potential auth issues
    if (currentUser && !token) {
      console.warn('User data found but no token, might need to re-authenticate');
      
      // Instead of immediately triggering a logout, set a flag so the UI can handle it gracefully
      sessionStorage.setItem('auth:tokenMissing', 'true');
      
      // Only dispatch an auth error event if we're not already in recovery mode
      if (!sessionStorage.getItem('auth:recovering')) {
        window.dispatchEvent(new CustomEvent('auth:warning', {
          detail: { message: 'Your session may have expired. Please select a batch to continue.' }
        }));
      }
    }
  }
  
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
};

// Set multipart form config
const multipartConfig = () => {
  return {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${getToken()}`,
    },
  };
};

// Get all teachers
export const getTeachers = async () => {
  try {
    const response = await axios.get(API_URL, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get teacher by ID
export const getTeacherById = async (id: string) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create teacher
export const createTeacher = async (teacher: Teacher) => {
  try {
    const response = await axios.post(API_URL, teacher, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update teacher
export const updateTeacher = async (id: string, teacher: Partial<Teacher>) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, teacher, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete teacher
export const deleteTeacher = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Assign subject to teacher
export const assignSubject = async (teacherId: string, subjectId: string) => {
  try {
    const response = await axios.post(
      `${API_URL}/${teacherId}/subjects`,
      { subjectId },
      authConfig()
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Remove subject from teacher
export const removeSubject = async (teacherId: string, subjectId: string) => {
  try {
    const response = await axios.delete(
      `${API_URL}/${teacherId}/subjects/${subjectId}`,
      authConfig()
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Import teachers from Excel
export const importTeachersFromExcel = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      `${API_URL}/import-excel`,
      formData,
      multipartConfig()
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get students by teacher ID
export const getStudentsByTeacher = async (teacherId: string) => {
  try {
    console.log(`Fetching students for teacher ID: ${teacherId}`);
    
    // Check if we have a token
    const token = getToken();
    console.log('Auth token available:', !!token);
    
    if (!token) {
      console.error('No authentication token found');
      throw new Error('Authentication token missing. Please log in again.');
    }
    
    const authHeaders = authConfig();
    console.log('Request headers:', authHeaders.headers);
    
    const response = await axios.get(
      `${API_URL}/${teacherId}/students`,
      authHeaders
    );
    
    console.log(`API returned ${response.data ? response.data.length : 0} students`);
    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching students by teacher:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
      
      // If unauthorized, redirect to login
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('Authentication error, should redirect to login');
        // Dispatch a login error event
        window.dispatchEvent(new CustomEvent('auth:error', {
          detail: { message: 'Your session has expired. Please log in again.' }
        }));
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    throw error;
  }
};

// Get submissions by teacher ID
export const getSubmissionsByTeacher = async (teacherId: string) => {
  try {
    const response = await axios.get(
      `${config.API_ENDPOINTS.SUBMISSIONS}/teacher/${teacherId}`,
      authConfig()
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get subjects assigned to the current teacher
export const getTeacherSubjects = async () => {
  try {
    console.log('Fetching teacher subjects...');
    
    // Get current user info
    const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
    const teacherInfo = userData ? JSON.parse(userData) : null;
    
    if (!teacherInfo || !teacherInfo.id) {
      console.error('No teacher info found in localStorage');
      throw new Error('Authentication information missing. Please log in again.');
    }
    
    const teacherId = teacherInfo.id;
    console.log('Teacher ID from localStorage:', teacherId);
    console.log('API URL:', `${API_URL}/subjects`);
    
    // Check if we have a token
    const token = getToken();
    console.log('Auth token available:', !!token);
    
    if (!token) {
      throw new Error('Authentication token missing. Please log in again.');
    }
    
    const authHeaders = authConfig();
    console.log('Request headers:', authHeaders.headers);
    
    const response = await axios.get(
      `${API_URL}/subjects`,
      authHeaders
    );
    
    console.log(`API returned ${response.data ? response.data.length : 0} subjects`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching teacher subjects:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
      
      // If unauthorized, dispatch an auth error event
      if (error.response.status === 401 || error.response.status === 403) {
        window.dispatchEvent(new CustomEvent('auth:error', {
          detail: { message: 'Your session has expired. Please log in again.' }
        }));
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    throw error;
  }
};

export default {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubject,
  removeSubject,
  importTeachersFromExcel,
  getStudentsByTeacher,
  getSubmissionsByTeacher,
  getTeacherSubjects
}; 