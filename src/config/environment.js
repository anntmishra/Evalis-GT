/**
 * Frontend Environment Configuration
 * 
 * This file centralizes all environment-specific configuration
 * to avoid hardcoded values throughout the application.
 */

// Default to development environment if not specified
const NODE_ENV = import.meta.env.NODE_ENV || 'development';
const IS_VERCEL = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

// API URLs based on environment
const API_BASE_URL = {
  development: 'http://localhost:3000/api',
  test: 'http://localhost:3000/api',
  production: IS_VERCEL ? null : '/api', // No API for Vercel frontend-only deployment
}[NODE_ENV];

// Export environment configuration
const config = {
  API_BASE_URL,
  IS_FRONTEND_ONLY: IS_VERCEL || !API_BASE_URL,
  API_ENDPOINTS: {
    AUTH: {
      STUDENT_LOGIN: API_BASE_URL ? `${API_BASE_URL}/auth/student/login` : null,
      TEACHER_LOGIN: API_BASE_URL ? `${API_BASE_URL}/auth/teacher/login` : null,
      TEACHER_SETUP_PASSWORD: API_BASE_URL ? `${API_BASE_URL}/auth/teacher/setup-password` : null,
      ADMIN_LOGIN: API_BASE_URL ? `${API_BASE_URL}/auth/admin/login` : null,
      PROFILE: API_BASE_URL ? `${API_BASE_URL}/auth/profile` : null,
    },
    TEACHERS: {
      BASE: API_BASE_URL ? `${API_BASE_URL}/teachers` : null,
      IMPORT: API_BASE_URL ? `${API_BASE_URL}/teachers/import-excel` : null,
    },
    STUDENTS: {
      BASE: API_BASE_URL ? `${API_BASE_URL}/students` : null,
      IMPORT: API_BASE_URL ? `${API_BASE_URL}/students/import-excel` : null,
    },
    SUBJECTS: API_BASE_URL ? `${API_BASE_URL}/subjects` : null,
    BATCHES: API_BASE_URL ? `${API_BASE_URL}/batches` : null,
    SUBMISSIONS: API_BASE_URL ? `${API_BASE_URL}/submissions` : null,
    SEMESTERS: API_BASE_URL ? `${API_BASE_URL}/semesters` : null,
    AI_ANALYZER: {
      BASE: API_BASE_URL ? `${API_BASE_URL}/ai-analyzer` : null,
      STUDENT_ANALYSIS: API_BASE_URL ? `${API_BASE_URL}/ai-analyzer/student` : null,
      SUBJECT_ANALYSIS: API_BASE_URL ? `${API_BASE_URL}/ai-analyzer/student/subject` : null,
      RECOMMENDATIONS: API_BASE_URL ? `${API_BASE_URL}/ai-analyzer/student/recommendations` : null,
      COMPREHENSIVE_DATA: API_BASE_URL ? `${API_BASE_URL}/ai-analyzer/comprehensive-data` : null,
      PREDICTIVE_ANALYSIS: API_BASE_URL ? `${API_BASE_URL}/ai-analyzer/predictive` : null,
    },
  },
  AUTH: {
    TOKEN_STORAGE_KEY: 'userToken',
    USER_STORAGE_KEY: 'user',
    CURRENT_USER_KEY: 'currentUser',
  }
};

export default config; 