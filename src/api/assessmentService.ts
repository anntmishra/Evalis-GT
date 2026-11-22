import api from './index.mjs';
import config from '../config/environment';

export type AssessmentSubject = { id: string; name: string };
export type AssessmentTeacher = { id: string; name: string };

export type StudentAssessment = {
  id: number;
  title: string;
  description: string;
  subjectId: string;
  subject: AssessmentSubject;
  examType: string;
  teacherId: string;
  teacher: AssessmentTeacher;
  dueDate: string | null;
  fileUrl: string | null;
  createdAt: string;
  submitted: boolean;
  submissionId: number | null;
  submittedAt: string | null;
  submissionFileUrl: string | null;
  gradingState: 'not_submitted' | 'submitted' | 'awaiting_publication' | 'published';
  grade: number | null;
  letterGrade: string | null;
  feedback: string;
  graded: boolean;
};

export type TeacherAssessment = Omit<StudentAssessment, 'submitted' | 'submissionId' | 'submittedAt' | 'submissionFileUrl' | 'gradingState' | 'grade' | 'letterGrade' | 'feedback' | 'graded'>;

export type AssessmentSubmission = {
  id: number;
  studentId: string;
  student: { id: string; name: string; section?: string; batch?: string } | null;
  subjectId: string;
  assignmentId: number;
  examType: string;
  submissionText: string;
  fileUrl: string | null;
  submissionDate: string;
  score: number | null;
  letterGrade?: string | null;
  feedback: string;
  graded: boolean;
  gradingState: string;
};

export const assessmentFileUrl = (value?: string | null) => {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith('/uploads/')) return `${config.API_BASE_URL}${value}`;
  return value;
};

export const getStudentAssessments = async (): Promise<StudentAssessment[]> => (await api.get('/assignments/student')).data;
export const getTeacherAssessments = async (): Promise<TeacherAssessment[]> => (await api.get('/assignments/teacher')).data;
export const getAssessmentSubmissions = async (id: number): Promise<AssessmentSubmission[]> => (await api.get(`/assignments/${id}/submissions`)).data;

export const submitAssessment = async (id: number, text: string, file?: File | null) => {
  const body = new FormData();
  body.append('submissionText', text);
  if (file) body.append('file', file);
  return (await api.post(`/submissions/assignment/${id}`, body, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};

export const gradeAssessmentSubmission = async (id: number, score: number, feedback: string) => (
  await api.put(`/submissions/${id}`, { score, feedback, gradingState: 'submitted' })
).data;

export const createAssessment = async (data: { title: string; description: string; subjectId: string; examType: string; dueDate: string | null; file?: File | null }) => {
  if (data.file) {
    const body = new FormData();
    body.append('title', data.title);
    body.append('description', data.description);
    body.append('subjectId', data.subjectId);
    body.append('examType', data.examType);
    if (data.dueDate) body.append('dueDate', data.dueDate);
    body.append('file', data.file);
    return (await api.post('/assignments/upload', body, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  }
  return (await api.post('/assignments', { ...data, file: undefined })).data;
};
