import axios from 'axios';
import { Teacher } from '../types/university';
import config from '../config/environment';

const API_URL = config.API_ENDPOINTS.TEACHERS.BASE;

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

export default {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubject,
  removeSubject,
  importTeachersFromExcel,
}; 