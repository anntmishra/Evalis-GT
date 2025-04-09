const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const Student = require('./models/studentModel');
const Teacher = require('./models/teacherModel');
const Admin = require('./models/adminModel');
const Subject = require('./models/subjectModel');
const Batch = require('./models/batchModel');
const Submission = require('./models/submissionModel');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Initial data
const batches = [
  {
    id: '2023-2027',
    name: 'BTech 2023-2027',
    startYear: 2023,
    endYear: 2027,
    department: 'CSE',
    active: true
  },
  {
    id: '2022-2026',
    name: 'BTech 2022-2026',
    startYear: 2022,
    endYear: 2026,
    department: 'CSE',
    active: true
  },
  {
    id: '2021-2025',
    name: 'BTech 2021-2025',
    startYear: 2021,
    endYear: 2025,
    department: 'CSE',
    active: true
  },
  {
    id: '2020-2024',
    name: 'BTech 2020-2024',
    startYear: 2020,
    endYear: 2024,
    department: 'CSE',
    active: true
  }
];

const subjects = [
  {
    id: 'CSE101',
    name: 'Introduction to Programming',
    section: 'CSE-1',
    description: 'Basic programming concepts using Python and C++',
    credits: 4
  },
  {
    id: 'CSE102',
    name: 'Data Structures',
    section: 'CSE-1',
    description: 'Fundamental data structures and algorithms',
    credits: 4
  },
  {
    id: 'CSE103',
    name: 'Database Management Systems',
    section: 'CSE-1',
    description: 'Relational databases, SQL, and database design',
    credits: 3
  },
  {
    id: 'CSE104',
    name: 'Computer Networks',
    section: 'CSE-1',
    description: 'Network architecture, protocols, and applications',
    credits: 3
  },
  {
    id: 'CSE201',
    name: 'Object Oriented Programming',
    section: 'CSE-2',
    description: 'OOP concepts with Java',
    credits: 4
  },
  {
    id: 'CSE202',
    name: 'Operating Systems',
    section: 'CSE-2',
    description: 'OS concepts and design',
    credits: 4
  },
  {
    id: 'CSE203',
    name: 'Software Engineering',
    section: 'CSE-2',
    description: 'Software development methodologies and practices',
    credits: 3
  },
  {
    id: 'CSE204',
    name: 'Web Development',
    section: 'CSE-2',
    description: 'Front-end and back-end web development',
    credits: 3
  }
];

const teachers = [
  {
    id: 'T001',
    name: 'Dr. Smith',
    email: 'smith@university.edu',
    password: 'smith123',
    subjects: ['CSE101', 'CSE102'],
    role: 'teacher'
  },
  {
    id: 'T002',
    name: 'Dr. Johnson',
    email: 'johnson@university.edu',
    password: 'johnson123',
    subjects: ['CSE201'],
    role: 'teacher'
  },
  {
    id: 'T003',
    name: 'Prof. Williams',
    email: 'williams@university.edu',
    password: 'williams123',
    subjects: ['CSE203', 'CSE204'],
    role: 'teacher'
  },
  {
    id: 'T004',
    name: 'Dr. Brown',
    email: 'brown@university.edu',
    password: 'brown123',
    subjects: ['CSE103'],
    role: 'teacher'
  }
];

const students = [
  {
    id: 'E23CSE001',
    name: 'Anant Mishra',
    section: 'CSE-1',
    batch: '2023-2027',
    password: 'anant123',
    role: 'student'
  },
  {
    id: 'E23CSE002',
    name: 'Kushagra',
    section: 'CSE-1',
    batch: '2023-2027',
    password: 'kushagra123',
    role: 'student'
  },
  {
    id: 'E23CSE003',
    name: 'Divyansh Chouhan',
    section: 'CSE-2',
    batch: '2023-2027',
    password: 'divyansh123',
    role: 'student'
  },
  {
    id: 'E23CSE004',
    name: 'Shubhangam Mishra',
    section: 'CSE-2',
    batch: '2023-2027',
    password: 'shubhangam123',
    role: 'student'
  }
];

const admins = [
  {
    username: 'admin',
    name: 'Admin User',
    email: 'admin@university.edu',
    password: 'admin123',
    role: 'admin'
  }
];

const submissions = [
  {
    studentId: 'E23CSE001',
    subjectId: 'CSE101',
    examType: 'assignment',
    submissionText: 'Implementation of Binary Search Tree with Red-Black Tree balancing',
    submissionDate: '2024-03-15',
    score: 92,
    plagiarismScore: 0,
    graded: true,
    gradedBy: 'T001',
    gradedDate: '2024-03-20'
  },
  {
    studentId: 'E23CSE001',
    subjectId: 'CSE102',
    examType: 'project',
    submissionText: 'Distributed Database System Implementation',
    submissionDate: '2024-03-20',
    score: 88,
    plagiarismScore: 5,
    graded: true,
    gradedBy: 'T001',
    gradedDate: '2024-03-25'
  },
  {
    studentId: 'E23CSE002',
    subjectId: 'CSE101',
    examType: 'assignment',
    submissionText: 'Advanced Binary Search Tree with AVL balancing',
    submissionDate: '2024-03-15',
    score: 95,
    plagiarismScore: 0,
    graded: true,
    gradedBy: 'T001',
    gradedDate: '2024-03-20'
  },
  {
    studentId: 'E23CSE003',
    subjectId: 'CSE201',
    examType: 'assignment',
    submissionText: 'Design Patterns in Enterprise Applications',
    submissionDate: '2024-03-15',
    score: 88,
    plagiarismScore: 2,
    graded: true,
    gradedBy: 'T002',
    gradedDate: '2024-03-20'
  }
];

// Import data
const importData = async () => {
  let conn;
  try {
    console.log('Connecting to database...'.yellow);
    conn = await connectDB();
    console.log('Connection established, starting import...'.green);
    
    // Clear existing data
    console.log('Clearing existing data...'.cyan);
    await Promise.all([
      Batch.deleteMany(),
      Subject.deleteMany(),
      Teacher.deleteMany(),
      Student.deleteMany(),
      Admin.deleteMany(),
      Submission.deleteMany()
    ]);
    console.log('Existing data cleared'.green);

    // Insert new data
    console.log('Importing new data...'.cyan);
    await Promise.all([
      Batch.insertMany(batches),
      Subject.insertMany(subjects),
      Teacher.insertMany(teachers),
      Student.insertMany(students),
      Admin.insertMany(admins),
      Submission.insertMany(submissions)
    ]);

    console.log('Data imported successfully'.green.inverse);
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    console.error(`Full error: ${error.stack}`.red);
    process.exit(1);
  } finally {
    // Close connection if it was established
    if (conn) {
      await mongoose.disconnect();
      console.log('Database connection closed'.yellow);
    }
  }
};

// Delete data
const destroyData = async () => {
  let conn;
  try {
    console.log('Connecting to database...'.yellow);
    conn = await connectDB();
    console.log('Connection established, starting data deletion...'.green);
    
    // Clear all data
    console.log('Deleting all data...'.cyan);
    await Promise.all([
      Batch.deleteMany(),
      Subject.deleteMany(),
      Teacher.deleteMany(),
      Student.deleteMany(),
      Admin.deleteMany(),
      Submission.deleteMany()
    ]);

    console.log('Data destroyed successfully'.red.inverse);
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`.red.bold);
    process.exit(1);
  } finally {
    // Close connection if it was established
    if (conn) {
      await mongoose.disconnect();
      console.log('Database connection closed'.yellow);
    }
  }
};

// Determine what to run
if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
} 