const asyncHandler = require('express-async-handler');
const { Teacher, Subject, TeacherSubject, Student, Batch } = require('../models');
const XLSX = require('xlsx');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * @desc    Get all teachers
 * @route   GET /api/teachers
 * @access  Private/Admin
 */
const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.findAll({
    attributes: { exclude: ['password'] },
    include: [{
      model: Subject,
      through: { attributes: [] }, // Don't include join table attributes
    }]
  });
  res.json(teachers);
});

/**
 * @desc    Get teacher by ID
 * @route   GET /api/teachers/:id
 * @access  Private/Admin
 */
const getTeacherById = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ 
    where: { id: req.params.id },
    attributes: { exclude: ['password'] },
    include: [{
      model: Subject,
      through: { attributes: [] }, // Don't include join table attributes
    }]
  });

  if (teacher) {
    res.json(teacher);
  } else {
    res.status(404);
    throw new Error('Teacher not found');
  }
});

/**
 * @desc    Create a new teacher
 * @route   POST /api/teachers
 * @access  Private/Admin
 */
const createTeacher = asyncHandler(async (req, res) => {
  try {
    console.log('Teacher creation request received');
    console.log('Request body:', req.body);
    
    const { name, email, subjects, password, role } = req.body;
    let { id } = req.body;

    console.log('Extracted fields:', { id, name, email, subjectsLength: subjects?.length });

    // Validate required name
    if (!name) {
      console.log('Missing required name field');
      res.status(400);
      throw new Error('Please provide the teacher name');
    }

    // Generate teacher ID if not provided
    if (!id) {
      id = await Teacher.generateTeacherId();
      console.log('Generated teacher ID:', id);
    }

    // Generate email if not provided
    const teacherEmail = email || Teacher.generateEmail(name);
    console.log('Teacher email:', teacherEmail);

    // Import generateRandomPassword
    const { generateRandomPassword } = require('../utils/passwordUtils');
    
    // Generate random password if email is provided, otherwise use default
    const generatedPassword = email ? generateRandomPassword(10) : Teacher.generatePassword(id);
    console.log(`Generated password for teacher ${id}: ${generatedPassword.substring(0, 3)}***`);
    
    // Use the generated password
    const teacherPassword = password || generatedPassword;

    // Check if teacher already exists
    const teacherExists = await Teacher.findOne({ where: { id } });

    if (teacherExists) {
      console.log('Teacher already exists with id:', id);
      res.status(400);
      throw new Error('Teacher already exists');
    }

    // Check if email already exists
    const emailExists = await Teacher.findOne({ where: { email: teacherEmail } });
    
    if (emailExists) {
      console.log('Email already in use:', teacherEmail);
      res.status(400);
      throw new Error('Email already in use');
    }

    console.log('Creating teacher in database...');
    // Create the teacher
    const teacher = await Teacher.create({
      id,
      name,
      email: teacherEmail,
      password: teacherPassword,
      role: role || 'teacher', // Ensure role is set
    });

    // If subjects were provided, assign them
    if (subjects && subjects.length > 0) {
      // Create teacher-subject associations
      const subjectAssociations = subjects.map(subjectId => ({
        teacherId: id,
        subjectId: subjectId
      }));
      
      await TeacherSubject.bulkCreate(subjectAssociations);
      
      // Reload teacher with subjects
      await teacher.reload({
        include: [{
          model: Subject,
          through: { attributes: [] }
        }]
      });
    }

    if (teacher) {
      console.log('Teacher created successfully:', teacher.id);
      
      // If email is provided, create Firebase user and send password reset link
      if (email) {
        try {
          console.log(`Attempting to create Firebase user for teacher ${id} with email ${email}`);
          
          // Import Firebase functions
          const { createFirebaseUser, sendPasswordResetEmail } = require('../utils/firebaseUtils');
          const { sendPasswordResetLink, sendLoginCredentials } = require('../utils/emailUtils');
          
          // Create Firebase user
          const firebaseUser = await createFirebaseUser(email, teacherPassword, {
            id: teacher.id,
            name: teacher.name,
          });
          
          console.log(`Firebase user created successfully with UID: ${firebaseUser?.uid}`);
          
          // Generate password reset link
          console.log(`Generating password reset link for ${email}`);
          const resetLink = await sendPasswordResetEmail(email);
          
          console.log(`Password reset link generated: ${resetLink.substring(0, 30)}...`);
          
          // Send password reset email
          console.log(`Sending password reset email to ${email}`);
          await sendPasswordResetLink({
            email,
            name: teacher.name,
          }, resetLink);
          
          console.log(`Password reset link sent to ${email}`);
          
          // Also send login credentials for reference (creating a teacher version of this utility)
          await sendLoginCredentials({
            email,
            name: teacher.name,
            id: teacher.id
          }, teacherPassword);
          
          console.log(`Login credentials sent to ${email}`);
          console.log(`All Firebase operations completed successfully for teacher ${id}`);
        } catch (error) {
          console.error(`Error with Firebase operations for teacher ${id}:`, error);
          // Don't fail the whole operation if Firebase operations fail
        }
      }
      
      res.status(201).json({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        Subjects: teacher.Subjects || [],
        role: teacher.role,
        initialPassword: email ? teacherPassword : undefined
      });
    } else {
      console.log('Failed to create teacher');
      res.status(400);
      throw new Error('Invalid teacher data');
    }
  } catch (error) {
    console.error('Error in teacher creation:', error);
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    throw error;
  }
});

/**
 * @desc    Update teacher
 * @route   PUT /api/teachers/:id
 * @access  Private/Admin
 */
const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ where: { id: req.params.id } });

  if (teacher) {
    const previousEmail = teacher.email;
    const newEmail = req.body.email;
    
    teacher.name = req.body.name || teacher.name;
    teacher.email = newEmail || teacher.email;
    
    // If email is being added for the first time or changed
    let passwordChanged = false;
    let generatedPassword;
    
    if (newEmail && (!previousEmail || newEmail !== previousEmail)) {
      // Import generateRandomPassword
      const { generateRandomPassword } = require('../utils/passwordUtils');
      
      // Generate a new password when email is added or changed
      generatedPassword = generateRandomPassword(10);
      teacher.password = generatedPassword;
      passwordChanged = true;
    } else if (req.body.password) {
      // Or if password is explicitly provided
      teacher.password = req.body.password;
      passwordChanged = true;
      generatedPassword = req.body.password;
    }

    const updatedTeacher = await teacher.save();

    // Update subjects if provided
    if (req.body.subjects) {
      // First remove all existing associations
      await TeacherSubject.destroy({ where: { teacherId: teacher.id } });
      
      // Then create new associations
      if (req.body.subjects.length > 0) {
        const subjectAssociations = req.body.subjects.map(subjectId => ({
          teacherId: teacher.id,
          subjectId: subjectId
        }));
        
        await TeacherSubject.bulkCreate(subjectAssociations);
      }
    }

    // Send login credentials if email was added or changed and create Firebase user
    if (passwordChanged && newEmail) {
      try {
        // Import Firebase functions
        const { createFirebaseUser, updateFirebaseUser, sendPasswordResetEmail } = require('../utils/firebaseUtils');
        const { sendPasswordResetLink, sendLoginCredentials } = require('../utils/emailUtils');
        
        // If changing email, first try to find if a Firebase user already exists
        let firebaseUser;
        try {
          if (previousEmail) {
            // Try to update the existing Firebase user with the new email
            firebaseUser = await updateFirebaseUser(null, { 
              email: newEmail,
              password: generatedPassword
            });
          }
        } catch (error) {
          console.log('No existing Firebase user to update, creating new one');
        }
        
        // If no existing user or couldn't update, create a new Firebase user
        if (!firebaseUser) {
          firebaseUser = await createFirebaseUser(newEmail, generatedPassword, {
            id: updatedTeacher.id,
            name: updatedTeacher.name,
          });
        }
        
        // Generate password reset link
        const resetLink = await sendPasswordResetEmail(newEmail);
        
        // Send password reset email
        await sendPasswordResetLink({
          email: newEmail,
          name: updatedTeacher.name,
        }, resetLink);
        
        console.log(`Firebase user updated/created and password reset link sent to ${newEmail}`);
        
        // Also send login credentials for reference
        await sendLoginCredentials({
          id: updatedTeacher.id,
          name: updatedTeacher.name,
          email: newEmail
        }, generatedPassword);
      } catch (error) {
        console.error('Error with Firebase operations:', error);
        // Continue even if Firebase operations fail
      }
    }

    // Reload teacher with updated subjects
    const teacherWithSubjects = await Teacher.findOne({
      where: { id: teacher.id },
      attributes: { exclude: ['password'] },
      include: [{
        model: Subject,
        through: { attributes: [] }
      }]
    });

    res.json({
      ...teacherWithSubjects.get(),
      initialPassword: passwordChanged && newEmail ? generatedPassword : undefined,
    });
  } else {
    res.status(404);
    throw new Error('Teacher not found');
  }
});

/**
 * @desc    Delete teacher
 * @route   DELETE /api/teachers/:id
 * @access  Private/Admin
 */
const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ where: { id: req.params.id } });

  if (teacher) {
    // First delete all teacher-subject associations
    await TeacherSubject.destroy({ where: { teacherId: teacher.id } });
    
    // Then delete the teacher
    await teacher.destroy();
    res.json({ message: 'Teacher removed' });
  } else {
    res.status(404);
    throw new Error('Teacher not found');
  }
});

/**
 * @desc    Assign subject to teacher
 * @route   POST /api/teachers/:id/subjects
 * @access  Private/Admin
 */
const assignSubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.body;
  
  if (!subjectId) {
    res.status(400);
    throw new Error('Subject ID is required');
  }
  
  const teacher = await Teacher.findOne({ where: { id: req.params.id } });
  
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }
  
  const subject = await Subject.findByPk(subjectId);
  
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }
  
  // Check if subject is already assigned
  const existingAssignment = await TeacherSubject.findOne({
    where: {
      teacherId: teacher.id,
      subjectId: subject.id
    }
  });
  
  if (existingAssignment) {
    res.status(400);
    throw new Error('Subject already assigned to this teacher');
  }
  
  // Create the association
  await TeacherSubject.create({
    teacherId: teacher.id,
    subjectId: subject.id
  });
  
  // Get updated teacher with subjects
  const updatedTeacher = await Teacher.findOne({
    where: { id: teacher.id },
    attributes: { exclude: ['password'] },
    include: [{
      model: Subject,
      through: { attributes: [] }
    }]
  });
  
  res.json(updatedTeacher);
});

/**
 * @desc    Remove subject from teacher
 * @route   DELETE /api/teachers/:id/subjects/:subjectId
 * @access  Private/Admin
 */
const removeSubject = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ where: { id: req.params.id } });
  
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }
  
  const subjectId = req.params.subjectId;
  const subject = await Subject.findByPk(subjectId);
  
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }
  
  // Check if teacher has this subject
  const assignment = await TeacherSubject.findOne({
    where: {
      teacherId: teacher.id,
      subjectId: subject.id
    }
  });
  
  if (!assignment) {
    res.status(400);
    throw new Error('This subject is not assigned to this teacher');
  }
  
  // Remove the association
  await assignment.destroy();
  
  // Get updated teacher with subjects
  const updatedTeacher = await Teacher.findOne({
    where: { id: teacher.id },
    attributes: { exclude: ['password'] },
    include: [{
      model: Subject,
      through: { attributes: [] }
    }]
  });
  
  res.json(updatedTeacher);
});

/**
 * @desc    Import teachers from Excel file
 * @route   POST /api/teachers/import-excel
 * @access  Private/Admin
 */
const importTeachersFromExcel = asyncHandler(async (req, res) => {
  // Check if file is uploaded
  if (!req.files || !req.files.file) {
    res.status(400);
    throw new Error('Please upload an Excel file');
  }

  try {
    // Get the file buffer
    const file = req.files.file;
    const workbook = XLSX.read(file.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Validate and prepare data
    const teachersToCreate = [];
    const teachersToUpdate = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (!row.TeacherID && !row.ID) {
        errors.push(`Row ${i + 2}: Missing required field (TeacherID/ID)`);
        continue;
      }

      if (!row.Name && !row.TeacherName) {
        errors.push(`Row ${i + 2}: Missing required field (Name/TeacherName)`);
        continue;
      }

      if (!row.Email && !row.TeacherEmail) {
        errors.push(`Row ${i + 2}: Missing required field (Email/TeacherEmail)`);
        continue;
      }

      // Get field values (handle different column naming conventions)
      const teacherId = (row.TeacherID || row.ID || '').toString().trim();
      const teacherName = (row.Name || row.TeacherName || '').toString().trim();
      const teacherEmail = (row.Email || row.TeacherEmail || '').toString().trim();
      
      // Generate password (last 4 digits of ID)
      const defaultPassword = teacherId.slice(-4);
      
      // Create teacher object
      const teacherData = {
        id: teacherId,
        name: teacherName,
        email: teacherEmail,
        password: defaultPassword,
        role: 'teacher'
      };

      // Check if teacher already exists
      const existingTeacher = await Teacher.findOne({ where: { id: teacherData.id } });
      if (existingTeacher) {
        teachersToUpdate.push({
          id: teacherData.id,
          update: {
            name: teacherData.name,
            email: teacherData.email,
          }
        });
      } else {
        teachersToCreate.push(teacherData);
      }
    }

    // Create new teachers
    if (teachersToCreate.length > 0) {
      await Teacher.bulkCreate(teachersToCreate);
    }

    // Update existing teachers
    for (const teacher of teachersToUpdate) {
      await Teacher.update(
        teacher.update,
        { where: { id: teacher.id } }
      );
    }

    // Send confirmation emails (in a real application)
    // This would be handled by a separate service

    res.status(200).json({
      message: 'Teachers imported successfully',
      totalImported: teachersToCreate.length + teachersToUpdate.length,
      created: teachersToCreate.length,
      updated: teachersToUpdate.length,
      errors: errors
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500);
    throw new Error('Error processing Excel file: ' + error.message);
  }
});

/**
 * @desc    Auth teacher & get token
 * @route   POST /api/teachers/login
 * @access  Public
 */
const authTeacher = asyncHandler(async (req, res) => {
  const { id, password } = req.body;

  const teacher = await Teacher.findOne({ 
    where: { id },
    include: [{
      model: Subject,
      through: { attributes: [] }
    }]
  });

  if (teacher && (await teacher.matchPassword(password))) {
    res.json({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      subjects: teacher.Subjects || [],
      role: teacher.role,
      token: generateToken(teacher.id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid ID or password');
  }
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

/**
 * @desc    Get students by teacher ID based on subjects taught
 * @route   GET /api/teachers/:id/students
 * @access  Private/Teacher
 */
const getStudentsByTeacher = asyncHandler(async (req, res) => {
  try {
    // Ensure all required models are available
    if (!Teacher || !Subject || !Student) {
      console.error('Required models not available', { 
        Teacher: !!Teacher, 
        Subject: !!Subject, 
        Student: !!Student,
        Batch: !!Batch 
      });
      res.status(500);
      throw new Error('Server configuration error - required models not available');
    }
    
    // Get the teacher ID from the request
    const teacherId = req.params.id;
    console.log(`Getting students for teacher ID: ${teacherId}`);
    
    // Verify the teacher exists
    const teacher = await Teacher.findByPk(teacherId, {
      include: [{
        model: Subject,
        through: { attributes: [] }
      }]
    });
    
    if (!teacher) {
      console.log(`Teacher with ID ${teacherId} not found`);
      res.status(404);
      throw new Error('Teacher not found');
    }

    console.log(`Found teacher: ${teacher.name}, with ${teacher.Subjects ? teacher.Subjects.length : 0} subjects`);

    // Check if the requesting user is the teacher or an admin
    if (req.user && req.user.role !== 'admin' && req.user.id !== teacherId) {
      console.log(`Unauthorized access attempt. User: ${req.user.id}, Role: ${req.user.role}, Requested: ${teacherId}`);
      res.status(403);
      throw new Error('Not authorized to access students for this teacher');
    }

    // Get all subject IDs taught by this teacher
    const subjectIds = teacher.Subjects ? teacher.Subjects.map(subject => subject.id) : [];
    console.log(`Subject IDs taught by teacher: ${subjectIds.join(', ') || 'None'}`);
    
    if (subjectIds.length === 0) {
      console.log('No subjects assigned to this teacher, returning empty array');
      return res.json([]);
    }

    // First, get all the teacher's subjects with their section details
    const teacherSubjects = await Subject.findAll({
      where: {
        id: {
          [Op.in]: subjectIds
        }
      },
      include: [
        // Check if Batch model is available before using it in the include
        Batch ? {
          model: Batch,
          through: { attributes: [] }
        } : null
      ].filter(Boolean) // Filter out null values if Batch is undefined
    });

    console.log(`Found ${teacherSubjects.length} subjects with details`);
    teacherSubjects.forEach(subject => {
      console.log(`Subject ${subject.id}: ${subject.name}, Section: ${subject.section}`);
      if (subject.Batches) {
        console.log(`  Associated with batches: ${subject.Batches.map(b => b.id).join(', ')}`);
      }
    });

    // Extract the unique sections taught by this teacher
    const taughtSections = [...new Set(teacherSubjects.map(subject => subject.section).filter(Boolean))];
    console.log(`Sections taught: ${taughtSections.join(', ') || 'None'}`);
    
    // Extract all batch IDs associated with the teacher's subjects
    const taughtBatches = new Set();
    teacherSubjects.forEach(subject => {
      if (subject.Batches && Array.isArray(subject.Batches) && subject.Batches.length > 0) {
        subject.Batches.forEach(batch => {
          if (batch && batch.id) {
            taughtBatches.add(batch.id);
          }
        });
      }
    });
    const batchArray = [...taughtBatches];
    console.log(`Batches taught: ${batchArray.join(', ') || 'None'}`);

    if (taughtSections.length === 0 && batchArray.length === 0) {
      console.log('No sections or batches found, returning empty array');
      return res.json([]);
    }

    // Build the where clause based on what we have
    const whereClause = {};
    
    if (taughtSections.length > 0) {
      whereClause.section = {
        [Op.in]: taughtSections
      };
    }
    
    if (batchArray.length > 0) {
      whereClause.batch = {
        [Op.in]: batchArray
      };
    }
    
    // If we have both section and batch filters, use OR to include students from either
    const finalWhereClause = 
      taughtSections.length > 0 && batchArray.length > 0 
        ? { [Op.or]: [
            { section: { [Op.in]: taughtSections } },
            { batch: { [Op.in]: batchArray } }
          ]}
        : whereClause;

    // Now find students in those sections or batches
    const students = await Student.findAll({
      where: finalWhereClause,
      attributes: { exclude: ['password'] },
      order: [['id', 'ASC']]
    });

    console.log(`Found ${students.length} students`);

    // Get all batch ids
    const batchIds = [...new Set(students.map(s => s.batch).filter(Boolean))];
    console.log('Batch IDs found:', batchIds);

    // Get batch details if available
    let batches = [];
    try {
      if (batchIds.length > 0 && Batch) {
        batches = await Batch.findAll({
          where: {
            id: {
              [Op.in]: batchIds
            }
          }
        });
      }
      console.log(`Found ${batches.length} batches`);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }

    // Create a map of batch details for quick lookup
    const batchMap = batches.reduce((map, batch) => {
      map[batch.id] = batch;
      return map;
    }, {});

    // Process students with batch information
    const processedStudents = students.map(student => {
      const plainStudent = student.get({ plain: true });
      const batchId = plainStudent.batch;
      
      // Add batch information
      if (batchId) {
        const batchInfo = batchMap[batchId];
        if (batchInfo) {
          plainStudent.batchName = batchInfo.name;
        } else {
          plainStudent.batchName = `Batch ${batchId}`;
        }
      } else {
        // Assign default batch info if missing
        plainStudent.batch = 'default';
        plainStudent.batchName = 'Default Batch';
      }
      
      return plainStudent;
    });

    console.log('Processed students:', processedStudents.length);
    res.json(processedStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Server error while fetching students' });
  }
});

/**
 * @desc    Get current teacher's assigned subjects
 * @route   GET /api/teachers/subjects
 * @access  Private/Teacher
 */
const getTeacherSubjects = asyncHandler(async (req, res) => {
  try {
    // Check if user is logged in and has a valid ID
    if (!req.user || !req.user.id) {
      console.log('No valid user in request:', req.user);
      res.status(401);
      throw new Error('Not authenticated or invalid user');
    }
    
    // Get the logged-in teacher's ID from the JWT
    const teacherId = req.user.id;
    console.log(`Getting subjects for teacher ID: ${teacherId}`);
    
    // Find the teacher with their assigned subjects
    const teacher = await Teacher.findByPk(teacherId, {
      include: [{
        model: Subject,
        through: { attributes: [] }
      }]
    });
    
    if (!teacher) {
      console.log(`Teacher with ID ${teacherId} not found`);
      res.status(404);
      throw new Error('Teacher not found');
    }
    
    console.log(`Found teacher: ${teacher.name}, with ${teacher.Subjects ? teacher.Subjects.length : 0} subjects`);
    
    // If teacher is found but has no subjects
    if (!teacher.Subjects || teacher.Subjects.length === 0) {
      console.log('Teacher found but has no assigned subjects');
    } else {
      console.log('Subjects:', teacher.Subjects.map(s => `${s.id}: ${s.name}`).join(', '));
    }
    
    // Return the teacher's subjects (even if empty array)
    res.json(teacher.Subjects || []);
  } catch (error) {
    console.error('Error in getTeacherSubjects:', error);
    
    // If response has not been sent yet
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Server error fetching subjects',
        error: error.message
      });
    }
  }
});

/**
 * @desc    Create a test teacher account for development purposes
 * @route   POST /api/teachers/create-test-account
 * @access  Private/Admin
 */
const createTestTeacher = asyncHandler(async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      res.status(403);
      throw new Error('This endpoint is only available in development mode');
    }
    
    console.log('Creating test teacher account');
    
    // Use fixed data for test account
    const testData = {
      id: 'T0000',
      name: 'Test Teacher',
      email: req.body.email || 'teacher@test.com',
      password: 'password123', // Simple password for testing
      role: 'teacher'
    };
    
    console.log('Creating test account with email:', testData.email);
    
    // Check if test teacher already exists
    const existingTeacher = await Teacher.findOne({ 
      where: { 
        [Op.or]: [
          { id: testData.id },
          { email: testData.email }
        ]
      } 
    });
    
    if (existingTeacher) {
      // If exists, update the password
      existingTeacher.password = testData.password;
      await existingTeacher.save();
      
      console.log('Test teacher account updated');
      res.status(200).json({
        message: 'Test teacher account updated',
        id: existingTeacher.id,
        name: existingTeacher.name,
        email: existingTeacher.email,
        password: testData.password // Return password for testing purposes only
      });
    } else {
      // Create new test teacher
      const teacher = await Teacher.create(testData);
      
      console.log('Test teacher account created');
      res.status(201).json({
        message: 'Test teacher account created',
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        password: testData.password // Return password for testing purposes only
      });
    }
  } catch (error) {
    console.error('Error creating test teacher account:', error);
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    throw error;
  }
});

/**
 * @desc    Get students accessible to a teacher
 * @route   GET /api/teachers/students
 * @access  Private/Teacher
 */
const getAccessibleStudents = asyncHandler(async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Find all subjects assigned to the teacher along with their batch information
    const teacherWithSubjects = await Teacher.findByPk(teacherId, {
      include: [{
        model: Subject,
        include: [{
          model: Batch
        }]
      }]
    });
    
    if (!teacherWithSubjects) {
      res.status(404);
      throw new Error('Teacher not found');
    }
    
    // Extract unique batch IDs from teacher's subjects
    const batchIds = [...new Set(
      teacherWithSubjects.Subjects
        .map(subject => subject.batchId)
        .filter(id => id) // Filter out any undefined or null values
    )];
    
    if (batchIds.length === 0) {
      // Teacher has no assigned subjects with batches
      return res.json([]);
    }
    
    // Find all students from these batches
    const students = await Student.findAll({
      where: {
        batch: {
          [Op.in]: batchIds
        }
      },
      attributes: { exclude: ['password'] },
      include: [{
        model: Batch
      }]
    });
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching accessible students:', error);
    res.status(500).json({ message: 'Server error while fetching students' });
  }
});

/**
 * @desc    Get batches accessible to a teacher
 * @route   GET /api/teachers/batches
 * @access  Private/Teacher
 */
const getAccessibleBatches = asyncHandler(async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Find all subjects assigned to the teacher along with their batch information
    const teacherWithSubjects = await Teacher.findByPk(teacherId, {
      include: [{
        model: Subject,
        include: [{
          model: Batch
        }]
      }]
    });
    
    if (!teacherWithSubjects) {
      res.status(404);
      throw new Error('Teacher not found');
    }
    
    // Extract unique batch IDs from teacher's subjects
    const batchIds = [...new Set(
      teacherWithSubjects.Subjects
        .map(subject => subject.batchId)
        .filter(id => id) // Filter out any undefined or null values
    )];
    
    if (batchIds.length === 0) {
      // Teacher has no assigned subjects with batches
      return res.json([]);
    }
    
    // Find all batches
    const batches = await Batch.findAll({
      where: {
        id: {
          [Op.in]: batchIds
        }
      }
    });
    
    res.json(batches);
  } catch (error) {
    console.error('Error fetching accessible batches:', error);
    res.status(500).json({ message: 'Server error while fetching batches' });
  }
});

/**
 * @desc    Get teacher dashboard data
 * @route   GET /api/teachers/dashboard
 * @access  Private/Teacher
 */
const getTeacherDashboard = asyncHandler(async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Get teacher with subjects and their batches
    const teacher = await Teacher.findByPk(teacherId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Subject,
        include: [{
          model: Batch
        }]
      }]
    });
    
    if (!teacher) {
      res.status(404);
      throw new Error('Teacher not found');
    }
    
    // Extract all batch IDs from the teacher's subjects
    const batchIds = [...new Set(
      teacher.Subjects
        .map(subject => subject.batchId)
        .filter(id => id)
    )];
    
    // Get students from these batches
    const studentsPromise = batchIds.length > 0 ? Student.findAll({
      where: { batch: { [Op.in]: batchIds } },
      attributes: { exclude: ['password'] },
      include: [{ model: Batch }]
    }) : Promise.resolve([]);
    
    // Get all submissions for the teacher's subjects
    const submissionsPromise = teacher.Subjects.length > 0 ? 
      Submission.findAll({
        where: { 
          subjectId: { 
            [Op.in]: teacher.Subjects.map(s => s.id) 
          } 
        },
        include: [
          { model: Student, attributes: { exclude: ['password'] } },
          { model: Subject }
        ]
      }) : Promise.resolve([]);
    
    // Wait for all promises to resolve
    const [students, submissions] = await Promise.all([studentsPromise, submissionsPromise]);
    
    // Organize students by batch
    const studentsByBatch = {};
    students.forEach(student => {
      const batchId = student.batch;
      if (!studentsByBatch[batchId]) {
        studentsByBatch[batchId] = [];
      }
      studentsByBatch[batchId].push(student);
    });
    
    // Organize submissions by subject
    const submissionsBySubject = {};
    submissions.forEach(submission => {
      const subjectId = submission.subjectId;
      if (!submissionsBySubject[subjectId]) {
        submissionsBySubject[subjectId] = [];
      }
      submissionsBySubject[subjectId].push(submission);
    });
    
    res.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email
      },
      subjects: teacher.Subjects,
      studentsByBatch,
      submissionsBySubject
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
});

module.exports = {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubject,
  removeSubject,
  importTeachersFromExcel,
  authTeacher,
  getStudentsByTeacher,
  getTeacherSubjects,
  createTestTeacher,
  getAccessibleStudents,
  getAccessibleBatches,
  getTeacherDashboard
}; 