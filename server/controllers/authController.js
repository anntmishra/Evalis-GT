const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const { Student, Teacher, Admin, Subject } = require('../models');

/**
 * @desc    Auth student & get token
 * @route   POST /api/auth/student/login
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
      role: 'student',
      token: generateToken(student.id, 'student'),
    });
  } else {
    res.status(401);
    throw new Error('Invalid ID or password');
  }
});

/**
 * @desc    Auth teacher & get token
 * @route   POST /api/auth/teacher/login
 * @access  Public
 */
const authTeacher = asyncHandler(async (req, res) => {
  const { id, password } = req.body;

  // Check for teacher
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
      role: 'teacher',
      token: generateToken(teacher.id, 'teacher'),
    });
  } else {
    res.status(401);
    throw new Error('Invalid ID or password');
  }
});

/**
 * @desc    Auth admin & get token
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
const authAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  console.log(`Admin login attempt for username: ${username}`);

  // Check for admin
  const admin = await Admin.findOne({ where: { username } });

  if (!admin) {
    console.log(`Admin login failed: No admin found with username ${username}`);
    res.status(401);
    throw new Error('Invalid username or password');
  }

  const isMatch = await admin.matchPassword(password);
  console.log(`Admin password match result: ${isMatch}`);

  if (admin && isMatch) {
    console.log(`Admin login successful for: ${admin.username}`);
    res.json({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: 'admin',
      token: generateToken(admin.username, 'admin'),
    });
  } else {
    console.log(`Admin login failed: Invalid password for ${username}`);
    res.status(401);
    throw new Error('Invalid username or password');
  }
});

/**
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = asyncHandler(async (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// Generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

module.exports = {
  authStudent,
  authTeacher,
  authAdmin,
  getUserProfile,
}; 