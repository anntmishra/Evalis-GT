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
  const { email, password } = req.body;
  
  console.log(`Teacher login attempt with email: ${email}`);
  
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // Check for teacher by email (primary login method)
  const teacher = await Teacher.findOne({ 
    where: { email },
    include: [{
      model: Subject,
      through: { attributes: [] }
    }]
  });

  console.log(`Teacher found: ${teacher ? 'Yes' : 'No'}`);
  
  if (teacher) {
    console.log(`Teacher ID: ${teacher.id}, Name: ${teacher.name}`);
    const isMatch = await teacher.matchPassword(password);
    console.log(`Password match result: ${isMatch}`);
    
    if (isMatch) {
      res.json({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        subjects: teacher.Subjects || [],
        role: 'teacher',
        token: generateToken(teacher.id, 'teacher'),
      });
      return;
    }
  }
  
  res.status(401);
  throw new Error('Invalid email or password');
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

/**
 * @desc    Initial password setup for teachers
 * @route   POST /api/auth/teacher/setup-password
 * @access  Public
 */
const setupTeacherPassword = asyncHandler(async (req, res) => {
  const { id, email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Please provide email, current password, and new password');
  }

  // Find teacher by email
  const teacher = await Teacher.findOne({ where: { email } });

  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found with this email');
  }

  // Verify current password
  if (!(await teacher.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  // Update password
  teacher.password = newPassword;
  await teacher.save();

  res.status(200).json({ 
    message: 'Password updated successfully',
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    role: 'teacher',
    token: generateToken(teacher.id, 'teacher'),
  });
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
  setupTeacherPassword,
}; 