import axios from 'axios';
import config from '../config/environment';
import { Timetable } from '../types/university';

const API_BASE = `${config.API_BASE_URL}/timetables`;

const getToken = () => {
  const explicitToken = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  if (explicitToken) return explicitToken;
  try {
    const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
    if (!userData) return null;
    const parsed = JSON.parse(userData);
    return parsed?.token || null;
  } catch (err) {
    console.warn('Failed to parse user data for timetable auth token', err);
    return null;
  }
};

type PortalRole = 'admin' | 'teacher' | 'student';

const authHeaders = (role?: PortalRole) => {
  const token = getToken();
  if (!token) throw new Error('Authentication token missing');
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (role) {
    headers['x-portal-role'] = role;
  }
  return { headers };
};

export const generateTimetable = async (payload: {
  semesterId: string;
  batchId?: string;
  name?: string;
  options?: Record<string, any>;
  dryRun?: boolean;
}) => {
  const response = await axios.post(`${API_BASE}/generate`, payload, authHeaders('admin'));
  return response.data;
};

export const fetchTimetables = async (params: {
  semesterId?: string;
  batchId?: string;
  status?: string;
  includeSlots?: boolean;
} = {}) => {
  const response = await axios.get(`${API_BASE}`, {
    ...authHeaders('admin'),
    params
  });
  return response.data as { success: boolean; data: Timetable[] };
};

export const fetchTimetableById = async (id: number | string) => {
  const response = await axios.get(`${API_BASE}/${id}`, authHeaders('admin'));
  return response.data as { success: boolean; data: Timetable };
};

export const updateTimetableStatus = async (id: number | string, status: Timetable['status']) => {
  const response = await axios.patch(
    `${API_BASE}/${id}/status`,
    { status },
    authHeaders('admin')
  );
  return response.data;
};

export const deleteTimetable = async (id: number | string) => {
  const response = await axios.delete(`${API_BASE}/${id}`, authHeaders('admin'));
  return response.data;
};

export const fetchTeacherTimetable = async () => {
  const response = await axios.get(`${API_BASE}/teacher/me`, authHeaders('teacher'));
  return response.data as { success: boolean; data: Timetable | null };
};

export const fetchStudentTimetable = async () => {
  const response = await axios.get(`${API_BASE}/student/me`, authHeaders('student'));
  return response.data as { success: boolean; data: Timetable | null };
};

export const fetchTimetableSlots = async (timetableId: number | string) => {
  const response = await axios.get(`${API_BASE}/${timetableId}/slots`, authHeaders('admin'));
  return response.data as { success: boolean; data: Timetable['slots'] };
};