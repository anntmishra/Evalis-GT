const asyncHandler = require('express-async-handler');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const Admin = require('../models/adminModel');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Authenticate student
 * @route   POST /api/auth/student/login
 * @access  Public
 */
const loginStudent = asyncHandler(async (req, res) => {
  const { id, password } = req.body;

  const student = await Student.findOne({ id });

  if (student && (await student.matchPassword(password))) {
    res.json({
      _id: student._id,
      id: student.id,
      name: student.name,
      section: student.section,
      batch: student.batch,
      email: student.email,
      role: student.role,
      token: generateToken(student._id, student.role),
    });
  } else {
    res.status(401);
    throw new Error('Invalid ID or password');
  }
});

/**
 * @desc    Authenticate teacher
 * @route   POST /api/auth/teacher/login
 * @access  Public
 */
const loginTeacher = asyncHandler(async (req, res) => {
  const { id, password } = req.body;

  const teacher = await Teacher.findOne({ id });

  if (teacher && (await teacher.matchPassword(password))) {
    res.json({
      _id: teacher._id,
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      subjects: teacher.subjects,
      role: teacher.role,
      token: generateToken(teacher._id, teacher.role),
    });
  } else {
    res.status(401);
    throw new Error('Invalid ID or password');
  }
});

/**
 * @desc    Authenticate admin
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
const loginAdmin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });

  if (admin && (await admin.matchPassword(password))) {
    res.json({
      _id: admin._id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id, admin.role),
    });
  } else {
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
  if (!req.user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json(req.user);
});

module.exports = {
  loginStudent,
  loginTeacher,
  loginAdmin,
  getUserProfile,
}; 