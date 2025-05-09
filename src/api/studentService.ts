import axios from 'axios';
import { Student } from '../types/university';
import config from '../config/environment';

const API_URL = config.API_ENDPOINTS.STUDENTS.BASE;

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
          detail: { message: 'Your session may have expired. Please try again.' }
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

// Get all students
export const getAllStudents = async () => {
  try {
    console.log('Fetching all students from API');
    const response = await axios.get(API_URL, authConfig());
    
    // Log response structure to debug
    console.log('getAllStudents response structure:', {
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      hasStudents: response.data && response.data.students !== undefined,
    });
    
    // Handle both response formats: array or {students: array}
    const students = Array.isArray(response.data) 
      ? response.data 
      : (response.data.students || []);
      
    console.log(`Fetched ${students.length} students`);
    return students;
  } catch (error: any) {
    console.error('Error in getAllStudents:', error);
    // Add more context to the error
    if (error.response) {
      console.error('Server responded with:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response from server. Network issue?', error.request);
    }
    throw error;
  }
};

// Get students by batch
export const getStudentsByBatch = async (batchId: string) => {
  try {
    console.log(`Fetching students for batch: ${batchId}`);
    const response = await axios.get(`${config.API_ENDPOINTS.BATCHES}/${batchId}/students`, authConfig());
    
    // Log response structure to debug
    console.log('getStudentsByBatch response structure:', {
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      hasStudents: response.data && response.data.students !== undefined,
    });
    
    // Handle both response formats: array or {students: array}
    const students = Array.isArray(response.data) 
      ? response.data 
      : (response.data.students || []);
      
    console.log(`Fetched ${students.length} students for batch ${batchId}`);
    return students;
  } catch (error: any) {
    console.error(`Error in getStudentsByBatch for batch ${batchId}:`, error);
    // Add more context to the error
    if (error.response) {
      console.error('Server responded with:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response from server. Network issue?', error.request);
    }
    throw error;
  }
};

// Get student by ID
export const getStudentById = async (id: string) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create student
export const createStudent = async (student: Partial<Student>) => {
  try {
    console.log('Creating student with data:', JSON.stringify(student));
    const response = await axios.post(API_URL, student, authConfig());
    console.log('Create student response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating student:', error.response?.data || error);
    throw error;
  }
};

// Update student
export const updateStudent = async (id: string, student: Partial<Student>) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, student, authConfig());
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

// Delete student
export const deleteStudent = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, authConfig());
    return response.data;
  } catch (error: any) {
    throw error;
  }
};

export default {
  getAllStudents,
  getStudentsByBatch,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
}; 