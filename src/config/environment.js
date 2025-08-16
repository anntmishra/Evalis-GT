/**
 * Frontend Environment Configuration
 * 
 * This file centralizes all environment-specific configuration
 * to avoid hardcoded values throughout the application.
 */

// Default to development environment if not specified
const NODE_ENV = import.meta.env.NODE_ENV || 'development';

// Allow explicit override via Vite env (safe access)
let viteEnv = {};
try {
  // In Vite / ESM this will succeed
  // eslint-disable-next-line no-undef
  viteEnv = import.meta.env || {};
} catch (e) {
  // Fallback for non-Vite contexts (tests, SSR) if ever needed
  if (typeof process !== 'undefined') {
    // eslint-disable-next-line no-undef
    viteEnv = process.env || {};
  }
}
const explicitBase = viteEnv?.VITE_API_BASE_URL || null;
const explicitPort = viteEnv?.VITE_API_PORT || null;

// Detect dev API port dynamically: if running Vite (5173/5174 etc.) prefer 3000 (our server port)
let detectedDevPort = '3000';
if (typeof window !== 'undefined') {
  const lp = window.location.port;
  if (['5173','5174','5175'].includes(lp)) {
    detectedDevPort = '3000'; // Changed from 3001 to 3000 to match our server
  }
}

const devPort = explicitPort || detectedDevPort;

// Function to get the appropriate API base URL.
// Removed legacy override that forced admins to port 5003 (no server listening -> Network Error).
// All roles now share the same API in dev unless explicitly overridden via VITE_API_BASE_URL.
const getApiBaseUrl = () => ({
  development: explicitBase || `http://localhost:${devPort}/api`,
  test: explicitBase || `http://localhost:${devPort}/api`,
  production: '/api'
}[NODE_ENV]);

// Function to get the correct base URL for files and static assets
const getFileBaseUrl = () => ({
  development: explicitBase || `http://localhost:${devPort}`,
  test: explicitBase || `http://localhost:${devPort}`,
  production: '' // Use relative URLs in production (same domain)
}[NODE_ENV]);

// API URLs based on environment (runtime-friendly for dev)
const API_BASE_URL = getApiBaseUrl();
const FILE_BASE_URL = getFileBaseUrl();

// Admin API now unified with main API (previous separate 5003 server disabled)
const ADMIN_API_BASE_URL = API_BASE_URL;

// Export environment configuration
const config = {
  API_BASE_URL,
  FILE_BASE_URL,
  ADMIN_API_BASE_URL,
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
    ASSIGNMENTS: `${API_BASE_URL}/assignments`,
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
  // Helper function to get file URLs with correct base
  getFileUrl: (fileUrl) => {
    if (!fileUrl) return '';
    // If fileUrl is already absolute, use as-is
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    // Otherwise, prepend the appropriate base URL
    return `${FILE_BASE_URL}${fileUrl}`;
  }
};

export default config; 