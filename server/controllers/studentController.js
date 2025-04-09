const asyncHandler = require('express-async-handler');
const Student = require('../models/studentModel');
const Submission = require('../models/submissionModel');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const Batch = require('../models/batchModel');

/**
 * @desc    Get all students
 * @route   GET /api/students
 * @access  Private/Admin
 */
const getStudents = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;
  const batch = req.query.batch || null;
  const section = req.query.section || null;
  
  const filter = {};
  if (batch) filter.batch = batch;
  if (section) filter.section = section;

  const count = await Student.countDocuments(filter);
  const students = await Student.find(filter)
    .select('-password')
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    students,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

/**
 * @desc    Get student by ID
 * @route   GET /api/students/:id
 * @access  Private/Admin or Teacher
 */
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ id: req.params.id }).select('-password');

  if (student) {
    res.json(student);
  } else {
    res.status(404);
    throw new Error('Student not found');
  }
});

/**
 * @desc    Create a new student
 * @route   POST /api/students
 * @access  Private/Admin
 */
const createStudent = asyncHandler(async (req, res) => {
  const { id, name, section, batch, email, password } = req.body;

  const studentExists = await Student.findOne({ id });

  if (studentExists) {
    res.status(400);
    throw new Error('Student already exists');
  }

  const student = await Student.create({
    id,
    name,
    section,
    batch,
    email,
    password: password || id, // Default password is the student ID
  });

  if (student) {
    res.status(201).json({
      _id: student._id,
      id: student.id,
      name: student.name,
      section: student.section,
      batch: student.batch,
      email: student.email,
    });
  } else {
    res.status(400);
    throw new Error('Invalid student data');
  }
});

/**
 * @desc    Update student
 * @route   PUT /api/students/:id
 * @access  Private/Admin
 */
const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ id: req.params.id });

  if (student) {
    student.name = req.body.name || student.name;
    student.section = req.body.section || student.section;
    student.batch = req.body.batch || student.batch;
    student.email = req.body.email || student.email;
    
    if (req.body.password) {
      student.password = req.body.password;
    }

    const updatedStudent = await student.save();

    res.json({
      _id: updatedStudent._id,
      id: updatedStudent.id,
      name: updatedStudent.name,
      section: updatedStudent.section,
      batch: updatedStudent.batch,
      email: updatedStudent.email,
    });
  } else {
    res.status(404);
    throw new Error('Student not found');
  }
});

/**
 * @desc    Delete student
 * @route   DELETE /api/students/:id
 * @access  Private/Admin
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ id: req.params.id });

  if (student) {
    await student.deleteOne();
    res.json({ message: 'Student removed' });
  } else {
    res.status(404);
    throw new Error('Student not found');
  }
});

/**
 * @desc    Get student submissions
 * @route   GET /api/students/:id/submissions
 * @access  Private/Student, Teacher, Admin
 */
const getStudentSubmissions = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ id: req.params.id });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Only the student or a teacher/admin can view their submissions
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    res.status(403);
    throw new Error('Not authorized to view this student\'s submissions');
  }

  const submissions = await Submission.find({ studentId: req.params.id })
    .sort({ submissionDate: -1 });

  res.json(submissions);
});

/**
 * @desc    Import students from array
 * @route   POST /api/students/import
 * @access  Private/Admin
 */
const importStudents = asyncHandler(async (req, res) => {
  const { students, batch } = req.body;

  if (!students || !Array.isArray(students) || students.length === 0) {
    res.status(400);
    throw new Error('No students to import');
  }

  if (!batch) {
    res.status(400);
    throw new Error('Batch is required');
  }

  const importedStudents = [];
  const errors = [];

  for (const student of students) {
    try {
      const { id, name, section } = student;
      
      if (!id || !name || !section) {
        errors.push(`Missing required fields for student: ${JSON.stringify(student)}`);
        continue;
      }

      const studentExists = await Student.findOne({ id });

      if (studentExists) {
        errors.push(`Student with ID ${id} already exists`);
        continue;
      }

      const newStudent = await Student.create({
        id,
        name,
        section,
        batch,
        password: id, // Default password is the student ID
      });

      importedStudents.push({
        id: newStudent.id,
        name: newStudent.name,
        section: newStudent.section,
      });
    } catch (error) {
      errors.push(`Error importing student ${student.id}: ${error.message}`);
    }
  }

  res.status(201).json({
    success: true,
    count: importedStudents.length,
    students: importedStudents,
    errors,
  });
});

/**
 * @desc    Import students from Excel file
 * @route   POST /api/students/import-excel
 * @access  Private/Admin
 */
const importStudentsFromExcel = asyncHandler(async (req, res) => {
  // Check if file is uploaded
  if (!req.files || !req.files.file) {
    res.status(400);
    throw new Error('Please upload an Excel file');
  }

  // Check if batchId is provided
  if (!req.body.batchId) {
    res.status(400);
    throw new Error('Batch ID is required');
  }

  // Verify that the batch exists
  const batch = await Batch.findOne({ id: req.body.batchId });
  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  try {
    // Get the file buffer
    const file = req.files.file;
    const workbook = XLSX.read(file.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Validate and prepare data
    const studentsToCreate = [];
    const studentsToUpdate = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (!row.id || !row.name) {
        errors.push(`Row ${i + 2}: Missing required fields (id, name)`);
        continue;
      }

      // Create student object
      const studentData = {
        id: row.id.toString().trim(),
        name: row.name.trim(),
        section: row.section ? row.section.trim() : '',
        batch: req.body.batchId,
        email: row.email ? row.email.trim() : '',
        password: row.password ? row.password.toString().trim() : row.id.toString().trim(), // Default to ID if no password provided
      };

      // Check if student already exists
      const existingStudent = await Student.findOne({ id: studentData.id });
      if (existingStudent) {
        studentsToUpdate.push({
          id: studentData.id,
          update: {
            name: studentData.name,
            section: studentData.section,
            batch: studentData.batch,
            email: studentData.email,
            ...(studentData.password !== existingStudent.id && { password: studentData.password })
          }
        });
      } else {
        studentsToCreate.push(studentData);
      }
    }

    // Create new students
    if (studentsToCreate.length > 0) {
      await Student.create(studentsToCreate);
    }

    // Update existing students
    for (const student of studentsToUpdate) {
      await Student.findOneAndUpdate(
        { id: student.id },
        student.update,
        { new: true }
      );
    }

    res.status(200).json({
      message: 'Students imported successfully',
      totalImported: studentsToCreate.length + studentsToUpdate.length,
      created: studentsToCreate.length,
      updated: studentsToUpdate.length,
      errors: errors
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500);
    throw new Error('Error processing Excel file: ' + error.message);
  }
});

// @desc    Auth student & get token
// @route   POST /api/students/login
// @access  Public
const authStudent = asyncHandler(async (req, res) => {
  const { id, password } = req.body;

  const student = await Student.findOne({ id });

  if (student && (await student.matchPassword(password))) {
    res.json({
      _id: student._id,
      id: student.id,
      name: student.name,
      email: student.email,
      section: student.section,
      batch: student.batch,
      role: student.role,
      token: generateToken(student._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid ID or password');
  }
});

// @desc    Get student profile
// @route   GET /api/students/profile
// @access  Private
const getStudentProfile = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.student._id);

  if (student) {
    res.json({
      _id: student._id,
      id: student.id,
      name: student.name,
      email: student.email,
      section: student.section,
      batch: student.batch,
      role: student.role,
    });
  } else {
    res.status(404);
    throw new Error('Student not found');
  }
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentSubmissions,
  importStudents,
  importStudentsFromExcel,
  authStudent,
  getStudentProfile,
}; 