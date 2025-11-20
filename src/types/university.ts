export interface Student {
  id: string;
  name: string;
  section: string;
  batch?: string;
  email?: string;
  role?: string;
  initialPassword?: string;
  firebaseUid?: string;
}

export interface Subject {
  id: string;
  name: string;
  section?: string; // subject section/code identifier
  description?: string;
  credits?: number;
  semesterId?: string;
  batchId?: string;
  Batch?: any;
  Semester?: any;
  code?: string; // deprecated: use 'section' instead
  instructor?: string; // optional instructor name populated client-side
  Teachers?: Teacher[];
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
  // Additional fields for enhanced functionality
  title?: string;
  subject?: string;
  submittedAt?: string;
  status?: 'pending' | 'submitted' | 'graded';
  grade?: number;
  letterGrade?: string;
  gradePoints?: number;
  assignmentId?: string;
  filePath?: string;
  fileName?: string;
  fileUrl?: string;
  gradedFileUrl?: string;
  annotations?: string;
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
  initialPassword?: string;
  password?: string;
  role?: string;
  clerkId?: string;
  Subjects?: Subject[]; // For when populated from backend
} 

export interface TimetableSlot {
  id: string;
  timetableId: number;
  subjectId: string;
  teacherId: string;
  section?: string | null;
  semesterId?: string | null;
  dayOfWeek: number;
  dayName: string;
  slotIndex: number;
  startTime: string;
  endTime: string;
  sessionLabel?: string | null;
  color?: string | null;
  subject?: Subject;
  teacher?: Teacher;
  info?: Record<string, unknown>;
}

export interface TimetableMetrics {
  requestedSessions: number;
  scheduledSessions: number;
  slotCount: number;
  unscheduledSessions: number;
  generatedAt: string;
  generationStrategy: string;
}

export interface Timetable {
  id: number;
  name: string;
  semesterId?: string;
  batchId?: string;
  generatedBy?: string;
  status: 'draft' | 'active' | 'published' | 'completed' | 'archived';
  generationMethod?: string;
  version?: number;
  metadata?: Record<string, any>;
  metrics?: TimetableMetrics;
  slots?: TimetableSlot[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
  explanation?: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false';
  marks: number;
  orderIndex: number;
  explanation?: string;
  imageUrl?: string;
  options: QuizOption[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  teacherId: string;
  subjectId: string;
  batchId: string;
  timeLimit: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isPublished: boolean;
  allowMultipleAttempts: boolean;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showResultsImmediately: boolean;
  instructions?: string;
  questions?: QuizQuestion[];
  createdAt?: string;
  updatedAt?: string;
  Teacher?: Teacher;
  Subject?: Subject;
  Batch?: any;
  QuizAttempts?: QuizAttempt[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  startTime: string;
  endTime?: string;
  timeSpent?: number; // in seconds
  totalQuestions: number;
  questionsAttempted: number;
  correctAnswers: number;
  wrongAnswers: number;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  isPassed: boolean;
  status: 'in_progress' | 'completed' | 'abandoned' | 'time_up';
  submittedAt?: string;
  Quiz?: Quiz;
  Student?: Student;
}

export interface QuizAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId?: string;
  isCorrect: boolean;
  marksAwarded: number;
  timeSpent?: number;
  answeredAt?: string;
  QuizQuestion?: QuizQuestion;
  QuizOption?: QuizOption;
}

export interface QuizResult {
  attemptId: string;
  quizTitle: string;
  totalQuestions: number;
  questionsAttempted: number;
  correctAnswers: number;
  wrongAnswers: number;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  isPassed: boolean;
  timeSpent: number;
  submittedAt: string;
  passingMarks: number;
  answers?: QuizAnswer[];
}

export interface QuizAnalytics {
  totalAttempts: number;
  averageScore: number;
  passedCount: number;
  passRate: number;
  scoreDistribution: {
    '90-100': number;
    '80-89': number;
    '70-79': number;
    '60-69': number;
    '50-59': number;
    'below-50': number;
  };
  attempts: Array<{
    id: string;
    student: Student;
    marksObtained: number;
    totalMarks: number;
    percentage: number;
    isPassed: boolean;
    timeSpent: number;
    submittedAt: string;
  }>;
}