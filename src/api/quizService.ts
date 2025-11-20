import axios from 'axios';
import config from '../config/environment';

const API_URL = config.API_BASE_URL;

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('authToken') || 
         localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) ||
         localStorage.getItem('token') || '';
};

// Auth headers
const authHeaders = () => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  }
});

// Teacher APIs
export const createQuiz = async (quizData: any) => {
  const response = await axios.post(`${API_URL}/quizzes`, quizData, authHeaders());
  return response.data;
};

export const getTeacherQuizzes = async () => {
  const response = await axios.get(`${API_URL}/quizzes`, authHeaders());
  return response.data;
};

export const getQuizById = async (quizId: string) => {
  const response = await axios.get(`${API_URL}/quizzes/${quizId}`, authHeaders());
  return response.data;
};

export const updateQuiz = async (quizId: string, quizData: any) => {
  const response = await axios.put(`${API_URL}/quizzes/${quizId}`, quizData, authHeaders());
  return response.data;
};

export const deleteQuiz = async (quizId: string) => {
  const response = await axios.delete(`${API_URL}/quizzes/${quizId}`, authHeaders());
  return response.data;
};

// Student APIs
export const getStudentQuizzes = async () => {
  const response = await axios.get(`${API_URL}/quizzes/student`, authHeaders());
  return response.data;
};

export const startQuizAttempt = async (quizId: string) => {
  const response = await axios.post(`${API_URL}/quizzes/${quizId}/start`, {}, authHeaders());
  return response.data;
};

export const submitQuizAttempt = async (quizId: string, attemptId: string, answers: any[], timeSpent: number) => {
  const response = await axios.post(
    `${API_URL}/quizzes/${quizId}/submit`,
    { attemptId, answers, timeSpent },
    authHeaders()
  );
  return response.data;
};

export const getQuizResults = async (quizId: string) => {
  const response = await axios.get(`${API_URL}/quizzes/${quizId}/results`, authHeaders());
  return response.data;
};
