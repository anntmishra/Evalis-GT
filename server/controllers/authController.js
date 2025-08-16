const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const { Student, Teacher, Admin, Subject, Batch } = require('../models');
const { generateTokenWithSession, logout } = require('../utils/sessionManager');
const { logger } = require('../utils/logger');

/**
 * @desc    Auth student & get token
 * @route   POST /api/auth/student/login
 * @access  Public
 */
const authStudent = asyncHandler(async (req, res) => {
  const { id, password, email, firebaseToken } = req.body;

  logger.info(`Student login attempt for ID: ${id}, Email: ${email}, Firebase token: ${firebaseToken ? 'Yes' : 'No'}`);

  if ((!id && !email) || !password) {
    logger.warn('Student login rejected: Missing ID/email or password');
    res.status(400);
    throw new Error('Please provide student ID/email and password');
  }

  try {
    const allowFallback = process.env.ALLOW_PASSWORD_FALLBACK === 'true';
    // Check for student by ID (primary method) or email (secondary method)
    const whereClause = id ? { id } : { email };
    logger.debug(`Searching for student with:`, whereClause);

    const student = await Student.findOne({ where: whereClause });

    logger.debug(`Student found: ${student ? 'Yes' : 'No'}`);
    
    if (!student) {
      console.log('Student not found');
      res.status(401);
      throw new Error('Student not found with the provided ID/email');
    }

    logger.debug(`Student ID: ${student.id}, Name: ${student.name}, Email: ${student.email}`);
    
  // Try Firebase authentication first if we have an email
    let isAuthenticated = false;
    let authMethod = 'database';
    
    if (student.email && email) {
      try {
        // Import Firebase auth functions
        const { loginWithEmailAndPassword } = require('../config/firebase');
        
        // Try Firebase authentication
        const userCredential = await loginWithEmailAndPassword(student.email, password);
        if (userCredential && userCredential.user) {
          logger.info(`Firebase authentication successful for student: ${student.email}`);
          isAuthenticated = true;
          authMethod = 'firebase';
        }
      } catch (firebaseError) {
        logger.debug(`Firebase authentication failed: ${firebaseError.message}`);
        // Continue to database authentication
      }
    }
    
    // If Firebase auth failed or not available, optionally try database password
    if (!isAuthenticated) {
      if (allowFallback || !email) {
        const isMatch = await student.matchPassword(password);
        logger.debug(`Database password match result: ${isMatch}`);
        if (isMatch) {
          isAuthenticated = true;
          authMethod = 'database';
        }
      } else {
        logger.warn('Database password fallback disabled for student (email present)');
      }
    }
    
    if (isAuthenticated) {
      const { token, sessionId } = generateTokenWithSession(student, 'student');
      logger.info(`Student authentication successful via ${authMethod}: ${student.id}`);
      
      res.json({
        id: student.id,
        name: student.name,
        section: student.section,
        batch: student.batch,
        email: student.email,
        role: 'student',
        token: token,
        sessionId: sessionId,
        authMethod: authMethod // Include auth method for debugging
      });
      return;
    } else {
      logger.warn(`Student authentication failed for ${id || email}`);
      res.status(401);
      throw new Error('Invalid ID or password');
    }
  } catch (error) {
    console.error('Error in student authentication:', error);
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    throw error;
  }
});

/**
 * @desc    Auth teacher & get token
 * @route   POST /api/auth/teacher/login
 * @access  Public
 */
const authTeacher = asyncHandler(async (req, res) => {
  const { email, password, id, firebaseToken } = req.body;
  
  logger.info(`Teacher login attempt with email: ${email}, ID: ${id}, Firebase token: ${firebaseToken ? 'Yes' : 'No'}`);
  
  if ((!email && !id) || !password) {
    logger.warn('Teacher login rejected: Missing email/ID or password');
    res.status(400);
    throw new Error('Please provide email/ID and password');
  }

  try {
    const allowFallback = process.env.ALLOW_PASSWORD_FALLBACK === 'true';
    // Check for teacher by email (primary login method) or ID (secondary method)
    const whereClause = email ? { email } : { id };
    logger.debug(`Searching for teacher with:`, whereClause);
    
    const teacher = await Teacher.findOne({ 
      where: whereClause,
      include: [{
        model: Subject,
        include: [{
          model: Batch
        }],
        through: { attributes: [] }
      }]
    });

    logger.debug(`Teacher found: ${teacher ? 'Yes' : 'No'}`);
    
    if (!teacher) {
      console.log('Teacher not found');
      res.status(401);
      throw new Error('Teacher not found with the provided email/ID');
    }

    logger.debug(`Teacher ID: ${teacher.id}, Name: ${teacher.name}, Email: ${teacher.email}`);
    
    // Try Firebase authentication first if we have Firebase available
    let isAuthenticated = false;
    let authMethod = 'database';
    
    if (email) {
      try {
        // Import Firebase auth functions
        const { loginWithEmailAndPassword } = require('../config/firebase');
        
        // Try Firebase authentication
        const userCredential = await loginWithEmailAndPassword(email, password);
        if (userCredential && userCredential.user) {
          logger.info(`Firebase authentication successful for teacher: ${email}`);
          isAuthenticated = true;
          authMethod = 'firebase';
        }
      } catch (firebaseError) {
        logger.debug(`Firebase authentication failed: ${firebaseError.message}`);
        // Continue to database authentication
      }
    }
    
    // If Firebase auth failed or not available, optionally try database password
    if (!isAuthenticated) {
      if (allowFallback || !email) {
        const isMatch = await teacher.matchPassword(password);
        logger.debug(`Database password match result: ${isMatch}`);
        if (isMatch) {
          isAuthenticated = true;
          authMethod = 'database';
        }
      } else {
        logger.warn('Database password fallback disabled for teacher (email present)');
      }
    }
    
    if (isAuthenticated) {
      // Generate token with session management
      const { token, sessionId } = generateTokenWithSession(teacher, 'teacher');
      logger.info(`Teacher authentication successful via ${authMethod}: ${teacher.id}`);
      
      // Extract batch IDs from subjects
      const batchIds = [...new Set(
        teacher.Subjects
          .map(subject => subject.batchId)
          .filter(id => id)
      )];
      
      res.json({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        subjects: teacher.Subjects || [],
        batchIds: batchIds,
        role: 'teacher',
        token: token,
        sessionId: sessionId,
        authMethod: authMethod // Include auth method for debugging
      });
      return;
    } else {
      logger.warn(`Teacher authentication failed for ${email || id}`);
      res.status(401);
      throw new Error('Invalid password');
    }
  } catch (error) {
    console.error('Error in teacher authentication:', error);
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    throw error;
  }
});

/**
 * @desc    Auth admin & get token
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
const authAdmin = asyncHandler(async (req, res) => {
  const { username, password, email, firebaseToken } = req.body;

  logger.info(`Admin login attempt for username: ${username}, email: ${email}, Firebase token: ${firebaseToken ? 'Yes' : 'No'}`);

  if ((!username && !email) || !password) {
    logger.warn('Admin login rejected: Missing username/email or password');
    res.status(400);
    throw new Error('Please provide username/email and password');
  }

  try {
    // Check for admin by username (primary) or email (secondary)
    const whereClause = username ? { username } : { email };
    logger.debug(`Searching for admin with:`, whereClause);

    const admin = await Admin.findOne({ where: whereClause });

    if (!admin) {
      logger.warn(`Admin login failed: No admin found with ${username || email}`);
      res.status(401);
      throw new Error('Invalid username/email or password');
    }

    logger.debug(`Admin ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}`);
    
    // Try Firebase authentication first if we have an email
    let isAuthenticated = false;
    let authMethod = 'database';
    
    if (admin.email && (email || username.includes('@'))) {
      try {
        // Import Firebase auth functions
        const { loginWithEmailAndPassword } = require('../config/firebase');
        
        // Try Firebase authentication
        const loginEmail = email || username;
        const userCredential = await loginWithEmailAndPassword(loginEmail, password);
        if (userCredential && userCredential.user) {
          logger.info(`Firebase authentication successful for admin: ${loginEmail}`);
          isAuthenticated = true;
          authMethod = 'firebase';
        }
      } catch (firebaseError) {
        logger.debug(`Firebase authentication failed: ${firebaseError.message}`);
        // Continue to database authentication
      }
    }
    
    // If Firebase auth failed or not available, try database password
    if (!isAuthenticated) {
      const isMatch = await admin.matchPassword(password);
      logger.debug(`Database password match result: ${isMatch}`);
      
      if (isMatch) {
        isAuthenticated = true;
        authMethod = 'database';
      } else {
        // Extra diagnostics (do not leak sensitive data to client)
        logger.warn(`Admin password mismatch for username=${admin.username}. Provided length=${password ? password.length : 'none'} hashLen=${admin.password ? admin.password.length : 'none'}`);
      }
    }

    if (isAuthenticated) {
      logger.info(`Admin authentication successful via ${authMethod}: ${admin.username}`);
      const { token, sessionId } = generateTokenWithSession(admin, 'admin');
      
      res.json({
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        token: token,
        sessionId: sessionId,
        authMethod: authMethod // Include auth method for debugging
      });
      return;
    } else {
      logger.warn(`Admin authentication failed for ${username || email}`);
      res.status(401);
      throw new Error('Invalid username/email or password');
    }
  } catch (error) {
    console.error('Error in admin authentication:', error);
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    throw error;
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

/**
 * @desc    Reset student password
 * @route   POST /api/auth/student/reset-password
 * @access  Private (Admin only)
 */
const resetStudentPassword = asyncHandler(async (req, res) => {
  const { studentId, newPassword } = req.body;

  // Verify admin access
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to reset passwords');
  }

  // Find student by ID
  const student = await Student.findOne({ where: { id: studentId } });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Check if student has an email
  if (!student.email) {
    res.status(400);
    throw new Error('Student does not have an email address set');
  }

  // Update password
  if (newPassword) {
    student.password = newPassword;
    await student.save();
    console.log(`Password reset for student ${studentId} by admin`);
    
    res.status(200).json({
      success: true,
      message: 'Student password has been reset'
    });
  } else {
    // If no new password is provided, we assume this is just checking if the student can have their password reset
    res.status(200).json({
      success: true,
      message: 'Student is eligible for password reset',
      email: student.email
    });
  }
});

/**
 * @desc    Handle bulk password reset emails
 * @route   POST /api/auth/bulk-password-reset
 * @access  Private/Admin
 */
const bulkPasswordReset = asyncHandler(async (req, res) => {
  const { emails } = req.body;

  // Verify admin access
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to perform bulk operations');
  }

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of email addresses');
  }

  const results = {
    total: emails.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // For each email, find the student and log that a password reset was requested
  for (const email of emails) {
    try {
      if (!email) {
        results.failed++;
        results.errors.push({ email: 'undefined', error: 'Email address is required' });
        continue;
      }

      const student = await Student.findOne({ where: { email } });
      
      if (!student) {
        results.failed++;
        results.errors.push({ email, error: 'Student not found with this email' });
        continue;
      }

      // In a production system, you would call your email service here
      // For now, we'll just log the request and count it as successful
      console.log(`Password reset email would be sent to ${email} for student ID ${student.id}`);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({ email, error: error.message });
    }
  }

  res.status(200).json({
    message: `Password reset emails processed: ${results.success} successful, ${results.failed} failed`,
    results
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const userId = req.user.id || req.user.username;
  
  if (token) {
    logout(userId, token);
    logger.info(`User logged out: ${userId}`);
  }
  
  res.json({ message: 'Logged out successfully' });
});

/**
 * @desc    Logout all sessions for user
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
const logoutAllSessions = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user.username;
  
  logout(userId); // This will invalidate all sessions for the user
  logger.info(`All sessions logged out for user: ${userId}`);
  
  res.json({ message: 'All sessions logged out successfully' });
});

/**
 * @desc    Sync Firebase password to database after Firebase password reset
 * @route   POST /api/auth/sync-firebase-password
 * @access  Public (but requires Firebase token verification)
 */
const syncFirebasePassword = asyncHandler(async (req, res) => {
  const { email, firebaseToken, userType = 'teacher' } = req.body;
  
  logger.info(`Password sync request for ${userType}: ${email}`);
  
  if (!email || !firebaseToken) {
    res.status(400);
    throw new Error('Email and Firebase token are required');
  }

  try {
    // Verify the Firebase token first
    const firebaseAdmin = require('firebase-admin');
    
    if (!firebaseAdmin.apps.length) {
      res.status(500);
      throw new Error('Firebase Admin SDK not initialized');
    }
    
    // Verify the Firebase token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(firebaseToken);
    
    if (decodedToken.email !== email) {
      res.status(403);
      throw new Error('Token email does not match provided email');
    }
    
    // Find the user in database
    let Model, whereClause;
    if (userType === 'teacher') {
      Model = Teacher;
      whereClause = { email };
    } else if (userType === 'student') {
      Model = Student;
      whereClause = { id: email }; // Students can use ID or email
    } else if (userType === 'admin') {
      Model = Admin;
      whereClause = { email }; // Admins use email
    } else {
      res.status(400);
      throw new Error('Invalid user type. Must be teacher, student, or admin');
    }
    
    const user = await Model.findOne({ where: whereClause });
    
    if (!user) {
      res.status(404);
      throw new Error(`${userType} not found with provided email/ID`);
    }
    
    // Generate a temporary password flag to indicate Firebase auth is primary
    const bcrypt = require('bcryptjs');
    const tempPassword = `firebase_auth_${Date.now()}`;
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);
    
    // Update the user's password in database with a flag
    await user.update({ 
      password: hashedTempPassword,
      firebaseAuth: true, // Add a flag to indicate Firebase auth is primary
      lastFirebaseSync: new Date()
    });
    
    logger.info(`Password synced successfully for ${userType}: ${email}`);
    
    res.json({
      success: true,
      message: 'Password synchronized successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userType
      }
    });
    
  } catch (error) {
    logger.error(`Error syncing Firebase password for ${email}:`, error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401);
      throw new Error('Firebase token has expired');
    } else if (error.code === 'auth/id-token-revoked') {
      res.status(401);
      throw new Error('Firebase token has been revoked');
    } else if (error.code === 'auth/invalid-id-token') {
      res.status(401);
      throw new Error('Invalid Firebase token');
    }
    
    if (!res.statusCode || res.statusCode === 200) {
      res.status(500);
    }
    throw error;
  }
});

// Generate JWT (keeping for backward compatibility)
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
  resetStudentPassword,
  bulkPasswordReset,
  logoutUser,
  logoutAllSessions,
  syncFirebasePassword,
}; 