// This file provides type definitions for the environment configuration

export interface Config {
  API_BASE_URL: string | null;
  IS_FRONTEND_ONLY: boolean;
  API_ENDPOINTS: {
    AUTH: {
      STUDENT_LOGIN: string | null;
      TEACHER_LOGIN: string | null;
      TEACHER_SETUP_PASSWORD: string | null;
      ADMIN_LOGIN: string | null;
      PROFILE: string | null;
    };
    TEACHERS: {
      BASE: string | null;
      IMPORT: string | null;
    };
    STUDENTS: {
      BASE: string | null;
      IMPORT: string | null;
    };
    SUBJECTS: string | null;
    BATCHES: string | null;
    SUBMISSIONS: string | null;
    SEMESTERS: string | null;
    AI_ANALYZER: {
      BASE: string | null;
      STUDENT_ANALYSIS: string | null;
      SUBJECT_ANALYSIS: string | null;
      RECOMMENDATIONS: string | null;
      COMPREHENSIVE_DATA: string | null;
      PREDICTIVE_ANALYSIS: string | null;
    };
  };
  AUTH: {
    TOKEN_STORAGE_KEY: string;
    USER_STORAGE_KEY: string;
    CURRENT_USER_KEY: string;
  };
}

declare const config: Config;
export default config; 