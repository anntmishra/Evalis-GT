const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { Student, Teacher, Admin } = require('../models');

// Middleware to protect routes that require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  console.log('Auth middleware checking token...');
  console.log('Headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
  
  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted from header');
      
      // Decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified, user role:', decoded.role);
      
      // Check if the user exists in any of the models
      // First try student model
      let user = await Student.findOne({ 
        where: { id: decoded.id },
        attributes: { exclude: ['password'] }
      });
      
      if (user) {
        // For students
        req.user = user;
        req.user.role = 'student';
        req.student = user;
        console.log('User authenticated:', req.user.role);
        return next();
      }

      // If not found in students, try teacher model
      user = await Teacher.findOne({ 
        where: { id: decoded.id },
        attributes: { exclude: ['password'] }
      });

      if (user) {
        // For teachers
        req.user = user;
        req.user.role = 'teacher';
        req.teacher = user;
        console.log('User authenticated:', req.user.role);
        return next();
      }

      // Finally try admin model (by username)
      user = await Admin.findOne({ 
        where: { username: decoded.id },
        attributes: { exclude: ['password'] }
      });

      if (user) {
        // For admins
        req.user = user;
        req.user.role = 'admin';
        req.admin = user;
        console.log('User authenticated:', req.user.role);
        return next();
      }

      // If user not found in any model
      if (!user) {
        console.log('No user found with decoded ID:', decoded.id);
        res.status(404);
        throw new Error('User not found');
      }

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