import axios from 'axios';
import config from '../config/environment';

// Create axios instance with base URL
const api = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const loginStudent = (id, password) => api.post('/auth/student/login', { id, password });
export const loginTeacher = (id, password) => api.post('/auth/teacher/login', { id, password });
export const loginAdmin = (username, password) => api.post('/auth/admin/login', { username, password });
export const getUserProfile = () => api.get('/auth/profile');

// Student API
export const getStudents = (batch = '', page = 1) => 
  api.get('/students', { params: { batch, page } });
export const getStudentById = (id) => api.get(`/students/${id}`);
export const getStudentSubmissions = (id) => api.get(`/students/${id}/submissions`);
export const createStudent = (studentData) => api.post('/students', studentData);
export const updateStudent = (id, studentData) => api.put(`/students/${id}`, studentData);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const importStudents = (formData) => api.post('/students/import', formData);
export const importStudentsFromExcel = (file, batchId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('batchId', batchId);
  
  console.log(`Uploading file ${file.name} to batch ${batchId}`);
  
  return api.post('/students/import-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Add timeout and additional error handling
    timeout: 60000, // Increase timeout to 60 seconds for large files
    validateStatus: (status) => {
      console.log(`Response status: ${status}`);
      return status >= 200 && status < 300; // Default validate function
    }
  }).catch(error => {
    console.error('Excel import error details:', error.response?.data || error.message);
    throw error; // Re-throw to let the component handle it
  });
};

// Teacher API
export const getTeachers = () => api.get('/teachers');
export const getTeacherById = (id) => api.get(`/teachers/${id}`);
export const createTeacher = (teacherData) => api.post('/teachers', teacherData);
export const updateTeacher = (id, teacherData) => api.put(`/teachers/${id}`, teacherData);
export const deleteTeacher = (id) => api.delete(`/teachers/${id}`);

// Subject API
export const getSubjects = () => api.get('/subjects');
export const getSubjectById = (id) => api.get(`/subjects/${id}`);
export const createSubject = (subjectData) => api.post('/subjects', subjectData);
export const updateSubject = (id, subjectData) => api.put(`/subjects/${id}`, subjectData);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`);

// Batch API
export const getBatches = () => api.get('/batches');
export const getBatchById = (id) => api.get(`/batches/${id}`);
export const createBatch = (batchData) => api.post('/batches', batchData);
export const updateBatch = (id, batchData) => api.put(`/batches/${id}`, batchData);
export const deleteBatch = (id) => api.delete(`/batches/${id}`);
export const getBatchStudents = (id) => api.get(`/batches/${id}/students`);

// Submission API
export const createSubmission = (submissionData) => api.post('/submissions', submissionData);
export const gradeSubmission = (id, gradeData) => api.put(`/submissions/${id}/grade`, gradeData);

export default api; 