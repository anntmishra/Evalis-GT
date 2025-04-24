export interface Student {
  id: string;
  name: string;
  section: string;
  batch?: string;
  email?: string;
  role?: string;
  initialPassword?: string;
}

export interface Subject {
  id: string;
  name: string;
  section?: string;
  description?: string;
  credits?: number;
}

export interface StudentSubmission {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  examType: string;
  submissionText: string;
  submissionDate: string;
  score?: number;
  plagiarismScore: number;
  feedback: string;
  graded: boolean;
  gradedBy: string | null;
  gradedDate: string | null;
}

export interface Batch {
  subjects: Subject[];
  students: Student[];
}

export interface BatchData {
  [key: string]: Batch;
}

export interface GradeRange {
  min: number;
  max: number;
  points: number;
}

export interface GradeScale {
  [key: string]: GradeRange;
}

export interface ExamType {
  id: string;
  name: string;
}

export interface ExamTypes {
  [key: string]: ExamType;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
} 