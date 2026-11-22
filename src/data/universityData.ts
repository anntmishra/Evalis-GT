import type { Subject, GradeScale, ExamType } from '../types/university';

export const BATCHES: {id: string, name: string}[] = [];

// Students are now managed through the database
// Use the API endpoints to fetch student data dynamically

export const SUBJECTS: Record<string, Subject[]> = {};

export const EXAM_TYPES: ExamType[] = [
  { id: 'mid-sem', name: 'Mid Semester' },
  { id: 'end-sem', name: 'End Semester' },
  { id: 'assignment', name: 'Assignment' },
  { id: 'project', name: 'Project' }
];

// Student submissions are now managed through the database
// Use the API endpoints to fetch submission data dynamically

export const GRADE_SCALE: GradeScale = {
  'A+': { min: 90, max: 100, points: 10 },
  'A': { min: 80, max: 89, points: 9 },
  'B+': { min: 70, max: 79, points: 8 },
  'B': { min: 60, max: 69, points: 7 },
  'C+': { min: 50, max: 59, points: 6 },
  'C': { min: 40, max: 49, points: 5 },
  'F': { min: 0, max: 39, points: 0 }
}; 