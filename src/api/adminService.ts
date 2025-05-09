import axios from 'axios';
import config from '../config/environment';
import { getAuthConfig } from './authUtils';

const API_URL = `${config.API_BASE_URL}/admin`;

interface GenerateSemestersResponse {
  success: boolean;
  created: number;
  total: number;
  message?: string;
  semesters?: any[];
}

interface SetActiveSemesterResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Generate semesters 1-8 for a batch
 */
export const generateSemestersForBatch = async (batchId: string): Promise<GenerateSemestersResponse> => {
  try {
    const response = await axios.post(`${API_URL}/semesters/generate/${batchId}`, {}, getAuthConfig());
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

/**
 * Set active semester for an individual student
 */
export const setActiveSemesterForStudent = async (
  semesterId: string, 
  studentId: string
): Promise<SetActiveSemesterResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/semesters/${semesterId}/student/${studentId}`, 
      {}, 
      getAuthConfig()
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

/**
 * Set active semester for all students in a batch
 */
export const setActiveSemesterForBatch = async (
  semesterId: string, 
  batchId: string
): Promise<SetActiveSemesterResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/semesters/${semesterId}/batch/${batchId}`, 
      {}, 
      getAuthConfig()
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
}; 