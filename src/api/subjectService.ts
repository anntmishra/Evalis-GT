import axios from 'axios';
import { Subject } from '../types/university';
import config from '../config/environment';

const API_URL = config.API_ENDPOINTS.SUBJECTS;

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

// Get all subjects
export const getAllSubjects = async () => {
  try {
    const response = await axios.get(API_URL, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get subject by ID
export const getSubjectById = async (id: string) => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create subject
export const createSubject = async (subject: Partial<Subject>) => {
  try {
    const response = await axios.post(API_URL, subject, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update subject
export const updateSubject = async (id: string, subject: Partial<Subject>) => {
  try {
    const response = await axios.put(`${API_URL}/${id}`, subject, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete subject
export const deleteSubject = async (id: string) => {
  try {
    const response = await axios.delete(`${API_URL}/${id}`, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get subjects by section
export const getSubjectsBySection = async (section: string) => {
  try {
    const response = await axios.get(`${API_URL}/section/${section}`, authConfig());
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectsBySection
}; 