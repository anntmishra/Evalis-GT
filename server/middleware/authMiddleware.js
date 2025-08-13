const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { Student, Teacher, Admin } = require('../models');
const firebaseAdmin = require('firebase-admin');
const { validateSession } = require('../utils/sessionManager');
const { logger } = require('../utils/logger');

// Enhanced token cache with user role separation to prevent conflicts
// Key format: "token:role" to ensure different user types don't conflict
const tokenCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

// Periodically clean expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenCache.entries()) {
    if (now > value.expiresAt) {
      tokenCache.delete(key);
    }
  }
}, 60000); // Clean every minute

// Middleware to protect routes that require authentication
const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  // Skip detailed logging in production to improve performance
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    logger.debug('Auth middleware checking token...');
    logger.debug('Headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
  }
  
  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      if (!token) {
        logger.warn('Token is empty or invalid');
        res.status(401);
        throw new Error('Not authorized, invalid token');
      }

      // Check cache first - but with role-specific key to prevent conflicts
      let cachedUser = null;
      let userRole = null;
      
      // Try to decode token first to get role information
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userRole = decoded.role;
        const cacheKey = `${token}:${userRole}`;
        cachedUser = tokenCache.get(cacheKey);
      } catch (err) {
        // Token invalid, will be handled below
      }
      
      if (cachedUser && cachedUser.expiresAt > Date.now()) {
        // Use cached user info
        req.user = cachedUser.user;
        req.user.role = cachedUser.role;
        
        // Set role-specific property
        if (cachedUser.role === 'student') req.student = cachedUser.user;
        if (cachedUser.role === 'teacher') req.teacher = cachedUser.user;
        if (cachedUser.role === 'admin') req.admin = cachedUser.user;
        
        if (isDev) logger.debug(`User authenticated from cache: ${req.user.id}, role: ${req.user.role}`);
        return next();
      }
      
      if (isDev) console.log('Token extracted from header: [REDACTED]');
      
      // First try to verify as a Firebase token
      try {
        // Check if Firebase Admin is initialized
        if (!firebaseAdmin.apps.length) {
          console.warn('Firebase Admin SDK not initialized, skipping Firebase token verification');
          throw new Error('Firebase not initialized');
        }
        
        // Try Firebase token verification with timeout
        const tokenVerificationPromise = firebaseAdmin.auth().verifyIdToken(token);
        
        // Add timeout to prevent hanging on Firebase verification
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Firebase token verification timeout'));
          }, 5000); // 5 second timeout
        });
        
        // Race the verification against the timeout
        const decodedFirebaseToken = await Promise.race([
          tokenVerificationPromise,
          timeoutPromise
        ]);
        
        console.log('Firebase token verified, uid:', decodedFirebaseToken.uid);
        console.log('Firebase token email:', decodedFirebaseToken.email);
        
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
          logger.info('Firebase user authenticated as student:', user.id);
          
          // Cache the user with role-specific key
          const cacheKey = `${token}:student`;
          tokenCache.set(cacheKey, {
            user,
            role: 'student',
            expiresAt: Date.now() + CACHE_TTL
          });
          
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
          logger.info('Firebase user authenticated as teacher:', user.id);
          
          // Cache the user with role-specific key
          const cacheKey = `${token}:teacher`;
          tokenCache.set(cacheKey, {
            user,
            role: 'teacher',
            expiresAt: Date.now() + CACHE_TTL
          });
          
          return next();
        }
        
        // If no exact match but we have a validated Firebase token, we could create a new user record
        // This is optional and depends on your application's requirements
        console.log('Firebase token valid, but no matching user in database. Email:', decodedFirebaseToken.email);
        
        // Option 1: Deny access because no matching user
        res.status(403);
        throw new Error('Valid Firebase token, but no matching user in our system');
        
        // Option 2: Auto-provision the user (uncomment if you want to implement this)
        // const newUser = await Student.create({
        //   email: decodedFirebaseToken.email,
        //   name: decodedFirebaseToken.name || decodedFirebaseToken.email.split('@')[0],
        //   // Add any other required fields with default values
        // });
        // req.user = newUser;
        // req.user.role = 'student';
        // req.student = newUser;
        // console.log('Auto-provisioned new student from Firebase token:', newUser.id);
        // return next();
        
      } catch (firebaseError) {
        // If it's not a valid Firebase token, try as a JWT token
        console.log('Firebase token verification failed:', firebaseError.message);
        
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
              logger.info('User authenticated as student:', req.user.id);
              
              // Cache the user with role-specific key
              const cacheKey = `${token}:student`;
              tokenCache.set(cacheKey, {
                user,
                role: 'student',
                expiresAt: Date.now() + CACHE_TTL
              });
              
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
              logger.info('User authenticated as teacher:', req.user.id);
              
              // Cache the user with role-specific key
              const cacheKey = `${token}:teacher`;
              tokenCache.set(cacheKey, {
                user,
                role: 'teacher',
                expiresAt: Date.now() + CACHE_TTL
              });
              
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
              logger.info('User authenticated as admin:', req.user.username);
              
              // Cache the user with role-specific key
              const cacheKey = `${token}:admin`;
              tokenCache.set(cacheKey, {
                user,
                role: 'admin',
                expiresAt: Date.now() + CACHE_TTL
              });
              
              return next();
            }
          } else {
            // If no role or unrecognized role, try all models
            logger.debug('No specific role found in token, trying all models...');
            
            // First try student model
            user = await Student.findOne({ 
              where: { id: decoded.id },
              attributes: { exclude: ['password'] }
            });
            
            if (user) {
              req.user = user;
              req.user.role = 'student';
              req.student = user;
              logger.info('User authenticated as student:', req.user.id);
              
              // Cache the user with role-specific key
              const cacheKey = `${token}:student`;
              tokenCache.set(cacheKey, {
                user,
                role: 'student',
                expiresAt: Date.now() + CACHE_TTL
              });
              
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
              logger.info('User authenticated as teacher:', req.user.id);
              
              // Cache the user with role-specific key
              const cacheKey = `${token}:teacher`;
              tokenCache.set(cacheKey, {
                user,
                role: 'teacher',
                expiresAt: Date.now() + CACHE_TTL
              });
              
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
              logger.info('User authenticated as admin:', req.user.username);
              
              // Cache the user with role-specific key
              const cacheKey = `${token}:admin`;
              tokenCache.set(cacheKey, {
                user,
                role: 'admin',
                expiresAt: Date.now() + CACHE_TTL
              });
              
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