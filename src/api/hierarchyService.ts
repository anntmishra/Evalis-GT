import axios from 'axios';
import config from '../config/environment';

const getToken = () => {
  let token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  if (!token) {
    const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user && user.token) {
          token = user.token;
        }
      } catch (error) {}
    }
  }
  return token;
};

const hierarchyApi = axios.create({
  baseURL: `${config.API_BASE_URL}/hierarchy`,
});

hierarchyApi.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getMyAssignments = async () => {
  return await hierarchyApi.get('/me');
};

export const assignHod = async (departmentId: string, email: string) => {
  return await hierarchyApi.post('/assign-hod', { departmentId, email });
};

export const assignCoordinator = async (batchId: string, email: string) => {
  return await hierarchyApi.post('/assign-coordinator', { batchId, email });
};
