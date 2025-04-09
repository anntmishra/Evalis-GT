const asyncHandler = require('express-async-handler');
const Teacher = require('../models/teacherModel');
const Subject = require('../models/subjectModel');

/**
 * @desc    Get all teachers
 * @route   GET /api/teachers
 * @access  Private/Admin
 */
const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find({}).select('-password');
  res.json(teachers);
});

/**
 * @desc    Get teacher by ID
 * @route   GET /api/teachers/:id
 * @access  Private/Admin
 */
const getTeacherById = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ id: req.params.id }).select('-password');

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
    const teacherExists = await Teacher.findOne({ id });

    if (teacherExists) {
      console.log('Teacher already exists with id:', id);
      res.status(400);
      throw new Error('Teacher already exists');
    }

    // Check if email already exists
    const emailExists = await Teacher.findOne({ email });
    
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
      subjects: subjects || [],
      password: password || id, // Default password is the teacher ID
      role: role || 'teacher', // Ensure role is set
    });

    if (teacher) {
      console.log('Teacher created successfully:', teacher.id);
      res.status(201).json({
        _id: teacher._id,
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        subjects: teacher.subjects,
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
  const teacher = await Teacher.findOne({ id: req.params.id });

  if (teacher) {
    teacher.name = req.body.name || teacher.name;
    teacher.email = req.body.email || teacher.email;
    
    if (req.body.subjects) {
      teacher.subjects = req.body.subjects;
    }
    
    if (req.body.password) {
      teacher.password = req.body.password;
    }

    const updatedTeacher = await teacher.save();

    res.json({
      _id: updatedTeacher._id,
      id: updatedTeacher.id,
      name: updatedTeacher.name,
      email: updatedTeacher.email,
      subjects: updatedTeacher.subjects,
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
  const teacher = await Teacher.findOne({ id: req.params.id });

  if (teacher) {
    await teacher.deleteOne();
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
  
  const teacher = await Teacher.findOne({ id: req.params.id });
  
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }
  
  const subject = await Subject.findOne({ id: subjectId });
  
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }
  
  // Check if subject is already assigned
  if (teacher.subjects.includes(subjectId)) {
    res.status(400);
    throw new Error('Subject already assigned to this teacher');
  }
  
  teacher.subjects.push(subjectId);
  await teacher.save();
  
  res.json({
    _id: teacher._id,
    id: teacher.id,
    name: teacher.name,
    subjects: teacher.subjects,
  });
});

/**
 * @desc    Remove subject from teacher
 * @route   DELETE /api/teachers/:id/subjects/:subjectId
 * @access  Private/Admin
 */
const removeSubject = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findOne({ id: req.params.id });
  
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }
  
  const subjectId = req.params.subjectId;
  
  // Check if teacher has this subject
  if (!teacher.subjects.includes(subjectId)) {
    res.status(400);
    throw new Error('This subject is not assigned to this teacher');
  }
  
  teacher.subjects = teacher.subjects.filter(s => s !== subjectId);
  await teacher.save();
  
  res.json({
    _id: teacher._id,
    id: teacher.id,
    name: teacher.name,
    subjects: teacher.subjects,
  });
});

module.exports = {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignSubject,
  removeSubject,
}; 