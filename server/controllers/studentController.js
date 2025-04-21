const asyncHandler = require('express-async-handler');
const { Student, Submission, Batch } = require('../models');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const { Op } = require('sequelize');

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

  const { count, rows: students } = await Student.findAndCountAll({
    where: filter,
    attributes: { exclude: ['password'] },
    limit: pageSize,
    offset: pageSize * (page - 1),
    order: [['id', 'ASC']]
  });

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
  const student = await Student.findOne({ 
    where: { id: req.params.id },
    attributes: { exclude: ['password'] }
  });

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

  const studentExists = await Student.findOne({ where: { id } });

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
  const student = await Student.findOne({ where: { id: req.params.id } });

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
  const student = await Student.findOne({ where: { id: req.params.id } });

  if (student) {
    await student.destroy();
    res.json({ message: 'Student removed' });
  } else {
    res.status(404);
    throw new Error('Student not found');
  }
});

/**
 * @desc    Get student submissions
 * @route   GET /api/students/:id/submissions
 * @access  Private/Admin or Teacher or Student (if own submissions)
 */
const getStudentSubmissions = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ where: { id: req.params.id } });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const submissions = await Submission.findAll({
    where: { studentId: req.params.id },
    order: [['submissionDate', 'DESC']]
  });

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

      const studentExists = await Student.findOne({ where: { id } });

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
  console.log('Import request received:', {
    files: req.files ? Object.keys(req.files) : 'No files',
    body: req.body,
    content_type: req.headers['content-type']
  });

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
  const batch = await Batch.findByPk(req.body.batchId);
  if (!batch) {
    res.status(404);
    throw new Error(`Batch with ID ${req.body.batchId} not found`);
  }

  try {
    // Get the file buffer
    const file = req.files.file;
    console.log('File info:', {
      name: file.name,
      size: file.size,
      mimetype: file.mimetype
    });

    // Check file type
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      res.status(400);
      throw new Error('Invalid file format. Please upload an Excel file (.xlsx, .xls) or CSV (.csv)');
    }

    let workbook;
    try {
      // Determine the type based on file extension
      const fileExt = file.name.split('.').pop().toLowerCase();
      let type = 'buffer';
      
      if (fileExt === 'csv') {
        // For CSV files, first convert to string then to sheet
        const csvString = file.data.toString('utf8');
        workbook = XLSX.read(csvString, { type: 'string' });
      } else {
        // For Excel files (.xlsx, .xls)
        workbook = XLSX.read(file.data, { type: 'buffer' });
      }
    } catch (error) {
      console.error('XLSX parsing error:', error);
      res.status(400);
      throw new Error(`Error parsing Excel file: ${error.message}`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      res.status(400);
      throw new Error('Excel file does not contain any sheets');
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      res.status(400);
      throw new Error('Could not read worksheet from Excel file');
    }
    
    let jsonData;
    try {
      jsonData = XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
      console.error('JSON conversion error:', error);
      res.status(400);
      throw new Error(`Error converting sheet to JSON: ${error.message}`);
    }

    // Check if we have any data
    if (!jsonData || jsonData.length === 0) {
      res.status(400);
      throw new Error('Excel file contains no data');
    }

    console.log('First row example:', jsonData[0]);

    // Validate and prepare data
    const studentsToCreate = [];
    const studentsToUpdate = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (!row.id && !row.ID && !row.StudentId && !row.StudentID) {
        errors.push(`Row ${i + 2}: Missing required fields (id)`);
        continue;
      }

      // Create student object
      const studentData = {
        id: (row.id || row.ID || row.StudentId || row.StudentID || '').toString().trim(),
        name: (row.name || row.Name || row.StudentName || '').toString().trim(),
        section: (row.section || row.Section || '').toString().trim() || batch.id.split('-')[0] || 'CSE-1',
        batch: req.body.batchId,
        email: (row.email || row.Email || row.StudentEmail || '').toString().trim(),
        password: (row.id || row.ID || row.StudentId || row.StudentID || '').toString().trim(), // Default to student ID
      };

      // Validate student data
      if (!studentData.id) {
        errors.push(`Row ${i + 2}: Student ID is required`);
        continue;
      }

      if (!studentData.name) {
        errors.push(`Row ${i + 2}: Student name is required`);
        continue;
      }

      // Generate a default password (last 4 digits of student ID)
      if (studentData.id.length >= 4) {
        studentData.password = studentData.id.slice(-4);
      }

      // Check if student already exists
      try {
        const existingStudent = await Student.findOne({ where: { id: studentData.id } });
        
        if (existingStudent) {
          studentsToUpdate.push({
            id: studentData.id,
            update: {
              name: studentData.name,
              section: studentData.section,
              batch: studentData.batch,
              email: studentData.email || existingStudent.email,
            }
          });
        } else {
          studentsToCreate.push(studentData);
        }
      } catch (error) {
        console.error(`Error checking student ${studentData.id}:`, error);
        errors.push(`Row ${i + 2}: Error processing student: ${error.message}`);
      }
    }

    // Create new students
    if (studentsToCreate.length > 0) {
      try {
        await Student.bulkCreate(studentsToCreate);
      } catch (error) {
        console.error('Error creating students:', error);
        errors.push(`Failed to create students: ${error.message}`);
      }
    }

    // Update existing students
    for (const student of studentsToUpdate) {
      try {
        await Student.update(
          student.update,
          { where: { id: student.id } }
        );
      } catch (error) {
        console.error(`Error updating student ${student.id}:`, error);
        errors.push(`Failed to update student ${student.id}: ${error.message}`);
      }
    }

    const response = {
      message: 'Students imported successfully',
      totalImported: studentsToCreate.length + studentsToUpdate.length,
      created: studentsToCreate.length,
      updated: studentsToUpdate.length,
      errors: errors
    };

    console.log('Import response:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500);
    throw new Error('Error processing Excel file: ' + error.message);
  }
});

/**
 * @desc    Auth student & get token
 * @route   POST /api/students/login
 * @access  Public
 */
const authStudent = asyncHandler(async (req, res) => {
  const { id, password } = req.body;

  // Check for student
  const student = await Student.findOne({ where: { id } });

  if (student && (await student.matchPassword(password))) {
    res.json({
      id: student.id,
      name: student.name,
      section: student.section,
      batch: student.batch,
      email: student.email,
      role: student.role,
      token: generateToken(student.id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid ID or password');
  }
});

/**
 * @desc    Get student profile
 * @route   GET /api/students/profile
 * @access  Private/Student
 */
const getStudentProfile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({
    where: { id: req.student.id },
    attributes: { exclude: ['password'] }
  });

  if (student) {
    res.json(student);
  } else {
    res.status(404);
    throw new Error('Student not found');
  }
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
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