import axios from 'axios';
import config from '../config/environment';
import { getAuthConfig } from './authUtils';

const BASE = `${config.API_BASE_URL}/coordinator`;

export interface CoordinatorStudent {
  id: string;
  name: string;
  email?: string;
  section?: string;
  batch: string;
  specializationId?: string | null;
  sectionGroupId?: string | null;
  cgpa?: number;
  Batch?: { id: string; name: string };
  Specialization?: { id: string; name: string; code: string };
  SectionGroup?: { id: string; name: string };
}

export interface SectionGroupSummary {
  id: string;
  name: string;
  batchId: string;
  semesterId: string;
  studentCount: number;
}

export const getMyStudents = async (): Promise<CoordinatorStudent[]> => {
  const res = await axios.get(`${BASE}/students`, await getAuthConfig());
  return res.data;
};

export const getStudentDetail = async (id: string): Promise<CoordinatorStudent> => {
  const res = await axios.get(`${BASE}/students/${id}`, await getAuthConfig());
  return res.data;
};

export const updateStudent = async (id: string, updates: Partial<{
  name: string;
  email: string;
  batch: string;
  section: string;
  sectionGroupId: string | null;
  specializationId: string | null;
}>): Promise<CoordinatorStudent> => {
  const res = await axios.put(`${BASE}/students/${id}`, updates, await getAuthConfig());
  return res.data;
};

export const getSectionGroups = async (batchId: string, semesterId: string): Promise<SectionGroupSummary[]> => {
  const res = await axios.get(`${BASE}/section-groups`, { ...(await getAuthConfig()), params: { batchId, semesterId } });
  return res.data;
};

export const createSectionGroup = async (data: { name: string; batchId: string; semesterId: string }) => {
  const res = await axios.post(`${BASE}/section-groups`, data, await getAuthConfig());
  return res.data;
};

export interface SpecializationOption {
  id: string;
  name: string;
  code: string;
}

export const getSpecializations = async (): Promise<SpecializationOption[]> => {
  const res = await axios.get(`${BASE}/specializations`, await getAuthConfig());
  return res.data;
};
