import type { Student, Subject, StudentSubmission, GradeScale, ExamType } from '../types/university';

export const BATCHES = [
  { id: '2023-2027', name: 'BTech 2023-2027' },
  { id: '2022-2026', name: 'BTech 2022-2026' },
  { id: '2021-2025', name: 'BTech 2021-2025' },
  { id: '2020-2024', name: 'BTech 2020-2024' }
];

export const STUDENTS: Record<string, Student[]> = {
  '2023-2027': [
    { id: 'E23CSE001', name: 'Anant Mishra', section: 'CSE-1' },
    { id: 'E23CSE002', name: 'Kushagra', section: 'CSE-1' },
    { id: 'E23CSE003', name: 'Divyansh Chouhan', section: 'CSE-2' },
    { id: 'E23CSE004', name: 'Shubhangam Mishra', section: 'CSE-2' }
  ],
  '2022-2026': [
    { id: 'E22CSE001', name: 'Rahul Kumar', section: 'CSE-1' },
    { id: 'E22CSE002', name: 'Neha Singh', section: 'CSE-2' }
  ],
  '2021-2025': [
    { id: 'E21CSE001', name: 'Amit Shah', section: 'CSE-1' },
    { id: 'E21CSE002', name: 'Riya Gupta', section: 'CSE-2' }
  ],
  '2020-2024': [
    { id: 'E20CSE001', name: 'Vikram Verma', section: 'CSE-1' },
    { id: 'E20CSE002', name: 'Sneha Reddy', section: 'CSE-2' }
  ]
};

export const SUBJECTS: Record<string, Subject[]> = {
  'CSE-1': [
    { id: 'CSE101', name: 'Introduction to Programming' },
    { id: 'CSE102', name: 'Data Structures' },
    { id: 'CSE103', name: 'Database Management Systems' },
    { id: 'CSE104', name: 'Computer Networks' }
  ],
  'CSE-2': [
    { id: 'CSE201', name: 'Object Oriented Programming' },
    { id: 'CSE202', name: 'Operating Systems' },
    { id: 'CSE203', name: 'Software Engineering' },
    { id: 'CSE204', name: 'Web Development' }
  ]
};

export const EXAM_TYPES: ExamType[] = [
  { id: 'mid-sem', name: 'Mid Semester' },
  { id: 'end-sem', name: 'End Semester' },
  { id: 'assignment', name: 'Assignment' },
  { id: 'project', name: 'Project' }
];

// Sample submission data for the 2023 batch students
export const STUDENT_SUBMISSIONS: Record<string, StudentSubmission[]> = {
  'E23CSE001': [
    {
      examType: 'assignment',
      subjectId: 'CSE101',
      submissionText: 'Implementation of Binary Search Tree with Red-Black Tree balancing',
      submissionDate: '2024-03-15',
      score: 92,
      plagiarismScore: 0
    },
    {
      examType: 'project',
      subjectId: 'CSE102',
      submissionText: 'Distributed Database System Implementation',
      submissionDate: '2024-03-20',
      score: 88,
      plagiarismScore: 5
    }
  ],
  'E23CSE002': [
    {
      examType: 'assignment',
      subjectId: 'CSE101',
      submissionText: 'Advanced Binary Search Tree with AVL balancing',
      submissionDate: '2024-03-15',
      score: 95,
      plagiarismScore: 0
    },
    {
      examType: 'project',
      subjectId: 'CSE102',
      submissionText: 'Cloud-based Database Management System',
      submissionDate: '2024-03-20',
      score: 90,
      plagiarismScore: 3
    }
  ],
  'E23CSE003': [
    {
      examType: 'assignment',
      subjectId: 'CSE201',
      submissionText: 'Design Patterns in Enterprise Applications',
      submissionDate: '2024-03-15',
      score: 88,
      plagiarismScore: 2
    },
    {
      examType: 'project',
      subjectId: 'CSE202',
      submissionText: 'Microservices Architecture Implementation',
      submissionDate: '2024-03-20',
      score: 91,
      plagiarismScore: 0
    }
  ],
  'E23CSE004': [
    {
      examType: 'assignment',
      subjectId: 'CSE201',
      submissionText: 'Enterprise Application Patterns and Best Practices',
      submissionDate: '2024-03-15',
      score: 89,
      plagiarismScore: 1
    },
    {
      examType: 'project',
      subjectId: 'CSE202',
      submissionText: 'Scalable Microservices with Docker and Kubernetes',
      submissionDate: '2024-03-20',
      score: 93,
      plagiarismScore: 0
    }
  ]
};

export const GRADE_SCALE: GradeScale = {
  'A+': { min: 90, max: 100, points: 10 },
  'A': { min: 80, max: 89, points: 9 },
  'B+': { min: 70, max: 79, points: 8 },
  'B': { min: 60, max: 69, points: 7 },
  'C+': { min: 50, max: 59, points: 6 },
  'C': { min: 40, max: 49, points: 5 },
  'F': { min: 0, max: 39, points: 0 }
}; 