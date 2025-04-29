const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { Student, Teacher, Admin } = require('../models');
const firebaseAdmin = require('firebase-admin');

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
      
      if (!token) {
        console.log('Token is empty or invalid');
        res.status(401);
        throw new Error('Not authorized, invalid token');
      }
      
      console.log('Token extracted from header:', token.substring(0, 15) + '...');
      
      // First try to verify as a Firebase token
      try {
        // Try Firebase token verification
        const decodedFirebaseToken = await firebaseAdmin.auth().verifyIdToken(token);
        console.log('Firebase token verified, uid:', decodedFirebaseToken.uid);
        
        // Check if this Firebase user exists in our database
        let user = await Student.findOne({
          where: { email: decodedFirebaseToken.email },
          attributes: { exclude: ['password'] }
        });
        
        if (user) {
          // For students
          req.user = user;
          req.user.role = 'student';
          req.student = user;
          console.log('Firebase user authenticated as student:', user.id);
          return next();
        }
        
        // If not found in students, try teacher model
        user = await Teacher.findOne({
          where: { email: decodedFirebaseToken.email },
          attributes: { exclude: ['password'] }
        });
        
        if (user) {
          // For teachers
          req.user = user;
          req.user.role = 'teacher';
          req.teacher = user;
          console.log('Firebase user authenticated as teacher:', user.id);
          return next();
        }
        
        // If the Firebase user doesn't match any database record
        console.log('Firebase user not found in database');
        res.status(404);
        throw new Error('User not found in our system');
        
      } catch (firebaseError) {
        // If it's not a valid Firebase token, try as a JWT token
        console.log('Firebase token verification failed, trying as JWT token:', firebaseError.message);
        
        try {
          // Decode JWT token
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('JWT token verified, user role:', decoded.role);
          
          // Check if the user exists in any of the models
          // Check user role from the token to determine which model to use
          const role = decoded.role || '';
          let user;
          
          if (role === 'student') {
            user = await Student.findOne({ 
              where: { id: decoded.id },
              attributes: { exclude: ['password'] }
            });
            
            if (user) {
              req.user = user;
              req.user.role = 'student';
              req.student = user;
              console.log('User authenticated as student:', req.user.id);
              return next();
            }
          } else if (role === 'teacher') {
            user = await Teacher.findOne({ 
              where: { id: decoded.id },
              attributes: { exclude: ['password'] }
            });
            
            if (user) {
              req.user = user;
              req.user.role = 'teacher';
              req.teacher = user;
              console.log('User authenticated as teacher:', req.user.id);
              return next();
            }
          } else if (role === 'admin') {
            user = await Admin.findOne({ 
              where: { username: decoded.id },
              attributes: { exclude: ['password'] }
            });
            
            if (user) {
              req.user = user;
              req.user.role = 'admin';
              req.admin = user;
              console.log('User authenticated as admin:', req.user.username);
              return next();
            }
          } else {
            // If no role or unrecognized role, try all models
            console.log('No specific role found in token, trying all models...');
            
            // First try student model
            user = await Student.findOne({ 
              where: { id: decoded.id },
              attributes: { exclude: ['password'] }
            });
            
            if (user) {
              req.user = user;
              req.user.role = 'student';
              req.student = user;
              console.log('User authenticated as student:', req.user.id);
              return next();
            }

            // If not found in students, try teacher model
            user = await Teacher.findOne({ 
              where: { id: decoded.id },
              attributes: { exclude: ['password'] }
            });

            if (user) {
              req.user = user;
              req.user.role = 'teacher';
              req.teacher = user;
              console.log('User authenticated as teacher:', req.user.id);
              return next();
            }

            // Finally try admin model (by username)
            user = await Admin.findOne({ 
              where: { username: decoded.id },
              attributes: { exclude: ['password'] }
            });

            if (user) {
              req.user = user;
              req.user.role = 'admin';
              req.admin = user;
              console.log('User authenticated as admin:', req.user.username);
              return next();
            }
          }

          // If user not found in any model
          console.log('No user found with decoded ID:', decoded.id);
          res.status(404);
          throw new Error('User not found');
        } catch (jwtError) {
          console.error('JWT token verification error:', jwtError.message);
          throw new Error('Invalid token format');
        }
      }
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

// Alias for admin middleware - alternative naming for better readability
const adminOnly = admin;

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

module.exports = { protect, admin, adminOnly, teacher, student }; 