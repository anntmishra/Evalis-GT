const { submissionView } = require('../utils/submissionView');
const { academicScope, deny } = require('../utils/academicScope');
const asyncHandler = require('express-async-handler');
const { Student, Submission, Batch, Subject, Assignment, Specialization, Program, School, Department } = require('../models');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { generateRandomPassword } = require('../utils/passwordUtils');
const { sendLoginCredentials, sendPasswordResetLink } = require('../utils/emailUtils');
const { normalizeEmail, validateEmail, unguessableLocalSecret, recordPendingInvite, sendAccountInvitation } = require('../services/accountProvisioningService');

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
  try {
    console.log('Creating student with data:', { 
      ...req.body, 
      password: req.body.password ? '[REDACTED]' : undefined 
    });
    
    const { id, name, section, batch } = req.body;
    const email = normalizeEmail(req.body.email);

    // Validate required fields
    if (!id || !section) {
      return res.status(400).json({ success: false, message: 'Please provide the student ID and section' });
    }
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the student name'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the student email'
      });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid student email' });
    }

    if (!batch) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the student batch'
      });
    }

    // Check if student already exists
    const studentExists = await Student.findOne({ where: { id } });
    if (studentExists) {
      return res.status(400).json({
        success: false,
        message: 'Student already exists'
      });
    }

    // Check if email already exists
    const emailExists = await Student.findOne({ where: { email } });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    console.log(`Creating student in database with ID: ${id}`);
    
    const student = await Student.create({
      id,
      name,
      section,
      batch,
      email,
      password: unguessableLocalSecret(),
      tenantId: req.tenantId,
    });
    await recordPendingInvite({ email, role: 'student', tenantId: req.tenantId, scope: { batchId: batch } });
    const invitation = await sendAccountInvitation({ email, role: 'student', name });

    console.log(`Student created successfully: ${student.id}`);

    res.status(201).json({
      success: true,
      data: {
        id: student.id,
        name: student.name,
        section: student.section,
        batch: student.batch,
        email: student.email,
        invitationSent: invitation.sent,
        invitationError: invitation.sent ? null : invitation.reason,
        message: invitation.sent ? 'Student created. An account setup invitation was emailed.' : `Student created, but the invitation was not sent: ${invitation.reason}`
      }
    });

  } catch (error) {
    console.error('Error in createStudent:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({
        success: false,
        message: 'Student with this ID or email already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create student'
      });
    }
  }
});

/**
 * @desc    Update student
 * @route   PUT /api/students/:id
 * @access  Private/Admin
 */
const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!student) { res.status(404); throw new Error('Student not found'); }
  const nextEmail = req.body.email ? normalizeEmail(req.body.email) : student.email;
  if (!validateEmail(nextEmail)) { res.status(400); throw new Error('Please provide a valid student email'); }
  const nextBatch = req.body.batch || student.batch;
  if (!(await Batch.findByPk(nextBatch))) { res.status(400); throw new Error('Selected batch does not exist'); }
  if (nextEmail !== student.email) {
    const duplicate = await Student.findOne({ where: { email: nextEmail } });
    if (duplicate && duplicate.id !== student.id) { res.status(409); throw new Error('Email already belongs to another student'); }
  }
  const emailChanged = nextEmail !== student.email;
  await student.update({ name: req.body.name || student.name, section: req.body.section || student.section, batch: nextBatch, email: nextEmail, ...(emailChanged ? { clerkId: null } : {}) });
  let invitationSent = false;
  if (emailChanged) {
    await recordPendingInvite({ email: nextEmail, role: 'student', tenantId: req.tenantId, scope: { batchId: nextBatch } });
    invitationSent = (await sendAccountInvitation({ email: nextEmail, role: 'student', name: student.name })).sent;
  }
  res.json({ id: student.id, name: student.name, section: student.section, batch: student.batch, email: student.email, invitationSent });
});

/**
 * @desc    Delete student
 * @route   DELETE /api/students/:id
 * @access  Private/Admin
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });

  if (student) {
    console.log(`Deleting student: ${student.id} (${student.name})`);
    
    // Delete from Clerk if clerkId exists
    if (student.clerkId) {
      try {
        const { clerkClient } = require('@clerk/express');
        await clerkClient.users.deleteUser(student.clerkId);
        console.log(`✅ Deleted Clerk user: ${student.clerkId} for student ${student.id}`);
      } catch (clerkError) {
        console.warn(`⚠️ Failed to delete Clerk user ${student.clerkId}: ${clerkError.message}`);
        // Continue with database deletion even if Clerk deletion fails
      }
    }
     
    // Delete the student from database
    console.log(`Deleting student ${student.id} from database`);
    await student.destroy();
    
    console.log(`Student ${student.id} successfully deleted from system`);
    res.json({ 
      message: 'Student removed'
    });
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
  const student = await Student.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Check if the requesting user has permission to view these submissions
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    res.status(403);
    throw new Error('Not authorized to view these submissions');
  }

  const scope = await academicScope(req);
  if (!scope.batchIds.includes(student.batch)) throw deny();
  const submissions = await Submission.findAll({
    where: { studentId: req.params.id, tenantId: req.tenantId },
    include: [
      {
        model: Subject,
        attributes: ['name'],
        required: true
      },
      {
        model: Assignment,
        attributes: ['title', 'description'],
        required: false
      }
    ],
    order: [['submissionDate', 'DESC']]
  });

  // Format the response to include subject name
  const formattedSubmissions = submissions.map(submission => ({
    ...submissionView(submission, req.user.role),
    subjectName: submission.Subject.name
  }));

  res.json(formattedSubmissions);
});

/**
 * @desc    Get submissions for current authenticated student
 * @route   GET /api/students/submissions
 * @access  Private/Student
 */
const getCurrentStudentSubmissions = asyncHandler(async (req, res) => {
  const student = req.user; // From auth middleware

  const submissions = await Submission.findAll({
    where: { studentId: student.id, tenantId: req.tenantId },
    include: [
      {
        model: Subject,
        attributes: ['name'],
        required: true
      },
      {
        model: Assignment,
        attributes: ['title', 'description'],
        required: false
      }
    ],
    order: [['submissionDate', 'DESC']]
  });

  // Format the response to include subject name
  const formattedSubmissions = submissions.map(submission => ({
    ...submissionView(submission, req.user.role),
    subjectName: submission.Subject.name
  }));

  res.json(formattedSubmissions);
});

/**
 * @desc    Get subjects for a student (independent of submissions)
 * @route   GET /api/students/:id/subjects
 * @access  Private (student self, teacher, or admin)
 */
const getStudentSubjects = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }
  console.log('[Diag:getStudentSubjects] START', { studentId: student.id, batch: student.batch, activeSemesterId: student.activeSemesterId });

  // Permission: student can view own, teacher/admin can view any
  if (req.user.role === 'student' && req.user.id !== req.params.id) {
    res.status(403);
    throw new Error('Not authorized to view these subjects');
  }

  // Base where clause: include subjects for student's batch OR legacy subjects with null batchId
  const whereClause = {
    [Op.or]: [
      { batchId: student.batch },
      { batchId: null } // Include legacy subjects not assigned to any batch
    ]
  };
  
  // If student has active semester, also filter by semester
  if (student.activeSemesterId) {
    whereClause[Op.and] = {
      [Op.or]: [
        { semesterId: student.activeSemesterId },
        { semesterId: null } // Include legacy subjects not assigned to any semester
      ]
    };
  }

  // Dynamically require to avoid circular reference issues
  const { Semester, Batch, Teacher } = require('../models');
  const subjects = await Subject.findAll({
    where: whereClause,
    include: [
      { model: Semester },
      { model: Batch },
      { model: Teacher, through: { attributes: [] } }
    ]
  });
  console.log('[Diag:getStudentSubjects] Subjects fetched', subjects.length);
  res.json(subjects);
  console.log('[Diag:getStudentSubjects] END');
});

/**
 * @desc    Get subjects for current authenticated student
 * @route   GET /api/students/subjects
 * @access  Private/Student
 */
const getCurrentStudentSubjects = asyncHandler(async (req, res) => {
  const student = req.user; // From auth middleware
  console.log('[Diag:getCurrentStudentSubjects] START', { studentId: student.id, batch: student.batch, activeSemesterId: student.activeSemesterId });

  // Show subjects from student's batch (all semesters) + legacy subjects with null batchId
  const whereClause = {
    [Op.or]: [
      { batchId: student.batch },
      { batchId: null } // Include legacy subjects not assigned to any batch
    ]
  };

  console.log('[Diag:getCurrentStudentSubjects] Query whereClause:', JSON.stringify(whereClause, null, 2));

  // Dynamically require to avoid circular reference issues
  const { Semester, Batch, Teacher } = require('../models');
  const subjects = await Subject.findAll({
    where: whereClause,
    include: [
      { model: Semester },
      { model: Batch },
      { model: Teacher, through: { attributes: [] } }
    ],
    order: [
      [{ model: Semester }, 'number', 'ASC'], // Order by semester number
      ['name', 'ASC'] // Then by subject name
    ]
  });
  console.log('[Diag:getCurrentStudentSubjects] Subjects fetched', subjects.length);
  res.json(subjects);
  console.log('[Diag:getCurrentStudentSubjects] END');
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
      const { id, name, section, email } = student;
      
      if (!id || !name || !section) {
        errors.push(`Missing required fields for student: ${JSON.stringify(student)}`);
        continue;
      }

      const studentExists = await Student.findOne({ where: { id } });

      if (studentExists) {
        errors.push(`Student with ID ${id} already exists`);
        continue;
      }

      // Generate random password if email is provided
      const password = email ? generateRandomPassword(10) : id;

      const newStudent = await Student.create({
        id,
        name,
        section,
        batch,
        email,
        password,
      });

      // Send email if provided
      if (email) {
        try {
          await sendLoginCredentials(newStudent, password);
          console.log(`Login credentials sent to ${email}`);
        } catch (emailError) {
          console.error(`Error sending email to ${email}:`, emailError);
          // Log but continue with imports
        }
      }

      importedStudents.push({
        id: newStudent.id,
        name: newStudent.name,
        section: newStudent.section,
        email: newStudent.email,
        initialPassword: email ? password : undefined,
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
    file: req.file ? { name: req.file.originalname, size: req.file.size } : 'No file',
    body: req.body,
    content_type: req.headers['content-type']
  });

  // Check if file is uploaded (multer populates req.file, not req.files)
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an Excel file');
  }

  // Check if batchId is provided (default batch -- rows may override it with their own Batch column)
  if (!req.body.batchId) {
    res.status(400);
    throw new Error('Batch ID is required');
  }

  // Verify that the default batch exists
  const batch = await Batch.findByPk(req.body.batchId);
  if (!batch) {
    res.status(404);
    throw new Error(`Batch with ID ${req.body.batchId} not found`);
  }

  try {
    // Get the file buffer
    const file = req.file;
    console.log('File info:', {
      name: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    });

    // Check file type
    if (!file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      res.status(400);
      throw new Error('Invalid file format. Please upload an Excel file (.xlsx, .xls) or CSV (.csv)');
    }

    let workbook;
    try {
      // Determine the type based on file extension
      const fileExt = file.originalname.split('.').pop().toLowerCase();

      if (fileExt === 'csv') {
        // For CSV files, first convert to string then to sheet
        const csvString = file.buffer.toString('utf8');
        workbook = XLSX.read(csvString, { type: 'string' });
      } else {
        // For Excel files (.xlsx, .xls)
        workbook = XLSX.read(file.buffer, { type: 'buffer' });
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
    const studentEmails = []; // Collect emails for password reset

    // Per-row overrides are looked up by code/id and cached so a sheet with hundreds of
    // rows sharing the same batch/specialization doesn't issue hundreds of duplicate queries.
    const batchCache = new Map([[batch.id, batch]]);
    const resolveBatch = async (batchIdRaw) => {
      if (!batchIdRaw) return batch;
      if (batchCache.has(batchIdRaw)) return batchCache.get(batchIdRaw);
      const found = await Batch.findByPk(batchIdRaw);
      batchCache.set(batchIdRaw, found);
      return found;
    };

    const specializationCache = new Map();
    const resolveSpecialization = async (specCodeRaw) => {
      if (!specCodeRaw) return undefined;
      if (specializationCache.has(specCodeRaw)) return specializationCache.get(specCodeRaw);
      const found = await Specialization.findOne({ where: { code: specCodeRaw } });
      specializationCache.set(specCodeRaw, found);
      return found;
    };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      // Skip empty rows
      if (!row.id && !row.ID && !row.StudentId && !row.StudentID) {
        errors.push(`Row ${i + 2}: Missing required fields (id)`);
        continue;
      }

      // Row-level batch override (falls back to the form's default batchId)
      const rowBatchId = (row.batch || row.Batch || row.BatchId || row.BatchID || '').toString().trim();
      const resolvedBatch = await resolveBatch(rowBatchId || undefined);
      if (rowBatchId && !resolvedBatch) {
        errors.push(`Row ${i + 2}: Batch '${rowBatchId}' not found`);
        continue;
      }

      // Row-level specialization (by Specialization code, e.g. "AI-ML")
      const specCode = (row.specialization || row.Specialization || row.SpecializationCode || '').toString().trim();
      const resolvedSpecialization = specCode ? await resolveSpecialization(specCode) : undefined;
      if (specCode && !resolvedSpecialization) {
        errors.push(`Row ${i + 2}: Specialization '${specCode}' not found`);
        continue;
      }

      // Create student object
      const studentData = {
        id: (row.id || row.ID || row.StudentId || row.StudentID || '').toString().trim(),
        name: (row.name || row.Name || row.StudentName || '').toString().trim(),
        section: (row.section || row.Section || '').toString().trim() || batch.id.split('-')[0] || 'CSE-1',
        batch: resolvedBatch.id,
        email: (row.email || row.Email || row.StudentEmail || '').toString().trim(),
        password: (row.id || row.ID || row.StudentId || row.StudentID || '').toString().trim(), // Default to student ID
        specializationId: resolvedSpecialization ? resolvedSpecialization.id : null,
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

      // Add email to the collection for password reset if it exists
      if (studentData.email) {
        studentEmails.push(studentData.email);
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
              specializationId: studentData.specializationId || existingStudent.specializationId,
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
        const createdStudents = await Student.bulkCreate(studentsToCreate);
        
        // Send login credentials for students with emails (no Firebase operations)
        for (const student of createdStudents) {
          if (student.email) {
            try {
              // Generate a random password
              const generatedPassword = generateRandomPassword(10);
              
              // Update student password in database
              await student.update({ password: generatedPassword });
              
              // Send login credentials
              await sendLoginCredentials(student, generatedPassword);
              console.log(`Login credentials sent to ${student.email}`);
            } catch (error) {
              console.error(`Error sending credentials for student ${student.id}:`, error);
              errors.push(`Failed to send credentials for student ${student.id}: ${error.message}`);
              // Continue with next student
            }
          }
        }
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
      emails: studentEmails, // Include emails for further processing
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
  try {
    const student = await Student.findOne({
      where: { id: req.user.id },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Batch,
          attributes: ['id', 'name', 'startYear', 'endYear', 'department'],
          include: [
            {
              model: Program,
              attributes: ['id', 'name', 'code'],
              include: [{ model: School, attributes: ['id', 'name', 'code'] }]
            },
            { model: Department, attributes: ['id', 'name', 'code'] }
          ]
        },
        {
          model: Specialization,
          attributes: ['id', 'name', 'code']
        }
      ]
    });

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    // Get subjects associated with the student's batch
    const batchSubjects = await Subject.findAll({
      where: {
        batchId: student.batch
      },
      attributes: ['id', 'name', 'section', 'credits', 'description']
    });

    // Get subjects from the student's active semester if available
    let semesterSubjects = [];
    if (student.activeSemesterId) {
      semesterSubjects = await Subject.findAll({
        where: {
          semesterId: student.activeSemesterId
        },
        attributes: ['id', 'name', 'section', 'credits', 'description']
      });
    }

    // Combine both sets of subjects (removing duplicates by ID)
    const allSubjectIds = new Set();
    const allSubjects = [];

    // Add batch subjects first
    batchSubjects.forEach(subject => {
      if (!allSubjectIds.has(subject.id)) {
        allSubjectIds.add(subject.id);
        allSubjects.push(subject);
      }
    });

    // Add semester subjects next
    semesterSubjects.forEach(subject => {
      if (!allSubjectIds.has(subject.id)) {
        allSubjectIds.add(subject.id);
        allSubjects.push(subject);
      }
    });

    // Send the student data along with the subjects
    res.json({
      ...student.get({ plain: true }),
      subjects: allSubjects
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500);
    throw new Error('Server error fetching student profile');
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
  getCurrentStudentSubmissions,
  getStudentSubjects,
  getCurrentStudentSubjects,
  importStudents,
  importStudentsFromExcel,
  authStudent,
  getStudentProfile,
}; 
