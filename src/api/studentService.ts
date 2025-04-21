import axios from 'axios';
import { Student } from '../types/university';
import config from '../config/environment';

const API_URL = config.API_ENDPOINTS.STUDENTS.BASE;

// Get token from storage
const getToken = () => {
  const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  return token;
};

// Set auth header
const authConfig = () => {
  const token = getToken();
  if (!token) {
    console.warn('No authentication token found');
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
    const response = await axios.get(API_URL, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get students by batch
export const getStudentsByBatch = async (batchId: string) => {
  try {
    const response = await axios.get(`${config.API_ENDPOINTS.BATCHES}/${batchId}/students`, authConfig());
    return response.data;
  } catch (error: any) {
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
  } catch (error) {
    console.error('Error creating student:', error.response?.data || error);
    throw error;
  }
};

// Update student
export const updateStudent = async (id: string, student: Partial<Student>) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, student, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete student
export const deleteStudent = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, authConfig());
    return response.data;
  } catch (error) {
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