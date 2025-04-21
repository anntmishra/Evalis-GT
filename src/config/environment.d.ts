declare module '../config/environment' {
  interface Config {
    API_BASE_URL: string;
    API_ENDPOINTS: {
      AUTH: {
        STUDENT_LOGIN: string;
        TEACHER_LOGIN: string;
        ADMIN_LOGIN: string;
        PROFILE: string;
      };
      TEACHERS: {
        BASE: string;
        IMPORT: string;
      };
      STUDENTS: {
        BASE: string;
        IMPORT: string;
      };
      SUBJECTS: string;
      BATCHES: string;
      SUBMISSIONS: string;
    };
    AUTH: {
      TOKEN_STORAGE_KEY: string;
      USER_STORAGE_KEY: string;
      CURRENT_USER_KEY: string;
    };
  }

  const config: Config;
  export default config;
} 