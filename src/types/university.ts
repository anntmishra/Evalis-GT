export interface Student {
  id: string;
  name: string;
  section: string;
  email?: string;
  batch?: string;
  password?: string;
}

export interface Subject {
  id: string;
  name: string;
  section?: string;
  description?: string;
  credits?: number;
}

export interface StudentSubmission {
  examType: string;
  subjectId: string;
  submissionText: string;
  submissionDate: string;
  score?: number;
  plagiarismScore?: number;
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