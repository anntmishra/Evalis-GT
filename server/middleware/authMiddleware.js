const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const Admin = require('../models/adminModel');

// Middleware to protect routes that require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  console.log('Auth middleware checking token...');
  console.log('Headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
  
  // Check if token exists in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted from header');
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified, user role:', decoded.role);
      
      // Get user based on role
      if (decoded.role === 'student') {
        req.user = await Student.findById(decoded.id).select('-password');
      } else if (decoded.role === 'teacher') {
        req.user = await Teacher.findById(decoded.id).select('-password');
      } else if (decoded.role === 'admin') {
        req.user = await Admin.findById(decoded.id).select('-password');
      }
      
      if (!req.user) {
        console.log('No user found with decoded ID:', decoded.id);
        res.status(404);
        throw new Error('User not found');
      }
      
      console.log('User authenticated:', req.user.role);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else {
    console.log('No token provided in Authorization header');
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Middleware to check if user is an admin
const admin = (req, res, next) => {
  console.log('Checking admin rights...');
  console.log('User:', req.user ? `ID: ${req.user.id}, Role: ${req.user.role}` : 'No user in request');
  
  if (req.user && req.user.role === 'admin') {
    console.log('Admin access granted');
    next();
  } else {
    console.log('Admin access denied');
    res.status(403);
    throw new Error('Not authorized as an admin');
  }
};

// Middleware to check if user is a teacher
const teacher = (req, res, next) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as a teacher');
  }
};

// Middleware to check if user is a student
const student = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as a student');
  }
};

module.exports = { protect, admin, teacher, student }; 