/**
 * Frontend Environment Configuration
 * 
 * This file centralizes all environment-specific configuration
 * to avoid hardcoded values throughout the application.
 */

// Get environment variables with fallbacks
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const NODE_ENV = import.meta.env.NODE_ENV || 'development';

// API URLs based on environment - prefer explicit env var if available
const API_BASE_URL = VITE_API_BASE_URL || {
  development: 'http://localhost:3001/api',
  test: 'http://localhost:3001/api',
  production: '/api', // In production, use relative path for same-origin API
}[NODE_ENV];

// Export environment configuration
const config = {
  API_BASE_URL,
  API_ENDPOINTS: {
    AUTH: {
      STUDENT_LOGIN: `${API_BASE_URL}/auth/student/login`,
      TEACHER_LOGIN: `${API_BASE_URL}/auth/teacher/login`,
      TEACHER_SETUP_PASSWORD: `${API_BASE_URL}/auth/teacher/setup-password`,
      ADMIN_LOGIN: `${API_BASE_URL}/auth/admin/login`,
      PROFILE: `${API_BASE_URL}/auth/profile`,
    },
    TEACHERS: {
      BASE: `${API_BASE_URL}/teachers`,
      IMPORT: `${API_BASE_URL}/teachers/import-excel`,
    },
    STUDENTS: {
      BASE: `${API_BASE_URL}/students`,
      IMPORT: `${API_BASE_URL}/students/import-excel`,
    },
    SUBJECTS: `${API_BASE_URL}/subjects`,
    BATCHES: `${API_BASE_URL}/batches`,
    SUBMISSIONS: `${API_BASE_URL}/submissions`,
    SEMESTERS: `${API_BASE_URL}/semesters`,
    AI_ANALYZER: {
      BASE: `${API_BASE_URL}/ai-analyzer`,
      STUDENT_ANALYSIS: `${API_BASE_URL}/ai-analyzer/student`,
      SUBJECT_ANALYSIS: `${API_BASE_URL}/ai-analyzer/student/subject`,
      RECOMMENDATIONS: `${API_BASE_URL}/ai-analyzer/student/recommendations`,
      COMPREHENSIVE_DATA: `${API_BASE_URL}/ai-analyzer/comprehensive-data`,
      PREDICTIVE_ANALYSIS: `${API_BASE_URL}/ai-analyzer/predictive`,
    },
  },
  AUTH: {
    TOKEN_STORAGE_KEY: 'userToken',
    USER_STORAGE_KEY: 'user',
    CURRENT_USER_KEY: 'currentUser',
  },
  IS_PRODUCTION: NODE_ENV === 'production',
  IS_DEVELOPMENT: NODE_ENV === 'development'
};

export default config; 