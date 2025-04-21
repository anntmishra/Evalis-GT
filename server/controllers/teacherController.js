const asyncHandler = require('express-async-handler');
const { Teacher, Subject, TeacherSubject } = require('../models');
const XLSX = require('xlsx');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

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
    
    const { id, name, email, subjects, password, role } = req.body;

    console.log('Extracted fields:', { id, name, email, subjectsLength: subjects?.length });

    // Validate required fields
    if (!id || !name || !email) {
      console.log('Missing required fields');
      res.status(400);
      throw new Error('Please provide id, name, and email');
    }

    // Check if teacher already exists
    const teacherExists = await Teacher.findOne({ where: { id } });

    if (teacherExists) {
      console.log('Teacher already exists with id:', id);
      res.status(400);
      throw new Error('Teacher already exists');
    }

    // Check if email already exists
    const emailExists = await Teacher.findOne({ where: { email } });
    
    if (emailExists) {
      console.log('Email already in use:', email);
      res.status(400);
      throw new Error('Email already in use');
    }

    console.log('Creating teacher in database...');
    // Create the teacher
    const teacher = await Teacher.create({
      id,
      name,
      email,
      password: password || id, // Default password is the teacher ID
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
      res.status(201).json({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        Subjects: teacher.Subjects || [],
        role: teacher.role,
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
    teacher.name = req.body.name || teacher.name;
    teacher.email = req.body.email || teacher.email;
    
    if (req.body.password) {
      teacher.password = req.body.password;
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

    // Reload teacher with updated subjects
    const teacherWithSubjects = await Teacher.findOne({
      where: { id: teacher.id },
      attributes: { exclude: ['password'] },
      include: [{
        model: Subject,
        through: { attributes: [] }
      }]
    });

    res.json(teacherWithSubjects);
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

module.exports = {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubject,
  removeSubject,
  importTeachersFromExcel,
  authTeacher
}; 