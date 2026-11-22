const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { Student, Teacher, Admin, UserRoleAssignment } = require('../models');
const { verifyClerkToken, mapClerkUserToLocal } = require('../utils/clerk');
const { resolveTenantId } = require('../utils/tenant');
const { logger } = require('../utils/logger');

// Teacher-table roles: any of these should populate req.teacher, since they're all
// promotions of the same underlying Teacher row (see hierarchyController/roleRequestController).
const TEACHER_SUBROLES = ['teacher', 'hod', 'dean', 'assistant_dean', 'programme_coordinator', 'coe'];

// Enhanced token cache with user role separation to prevent conflicts
// Key format: "token:role" to ensure different user types don't conflict
const tokenCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds (increased from 15 minutes)

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
  // Development uses the same authentication requirements as production.
  const isDev = process.env.NODE_ENV === 'development';

  let token;
  
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
        req.tenantId = cachedUser.tenantId || null;

        // Set role-specific property
        if (cachedUser.role === 'student') req.student = cachedUser.user;
        if (TEACHER_SUBROLES.includes(cachedUser.role)) req.teacher = cachedUser.user;
        if (cachedUser.role === 'admin') req.admin = cachedUser.user;

        if (isDev) logger.debug(`User authenticated from cache: ${req.user.id}, role: ${req.user.role}`);
        return next();
      }
      
      if (isDev) console.log('Token extracted from header: [REDACTED]');
      
      // First try Clerk session token (primary auth provider)
      try {
        const desiredRoleHeader = req.headers['x-portal-role'] || req.headers['x-user-role'] || '';
        const desiredRole = Array.isArray(desiredRoleHeader) ? desiredRoleHeader[0] : desiredRoleHeader;
        const clerkResult = await verifyClerkToken(token);
        if (clerkResult) {
          const { user: clerkUser, orgId } = clerkResult;
          const mapped = await mapClerkUserToLocal(clerkUser, { Student, Teacher, Admin }, { desiredRole });
          if (mapped) {
            const { user, role } = mapped;
            const tenantId = await resolveTenantId({ clerkOrgId: orgId, localUser: user });
            req.user = user;
            req.user.role = role;
            req.tenantId = tenantId;
            if (role === 'student') req.student = user;
            if (TEACHER_SUBROLES.includes(role)) req.teacher = user;
            if (role === 'admin') req.admin = user;
            // Cache
            const cacheKey = `${token}:${role}`;
            tokenCache.set(cacheKey, { user, role, tenantId, expiresAt: Date.now() + CACHE_TTL });
            if (isDev) logger.debug(`User authenticated via Clerk: ${user.id}, role: ${role}, tenant: ${tenantId}`);
            return next();
          } else {
            // If Clerk verified but no DB match, don't fall through to JWT
            if (isDev) logger.debug('Valid Clerk session but no matching DB user for desired role:', desiredRole || '(none)');
            return res.status(403).json({ message: 'Access denied: account not linked to this portal' });
          }
        }
      } catch (clerkErr) {
        if (isDev) logger.debug(`Clerk verification failed: ${clerkErr.message || clerkErr}`);
        // continue to JWT
      }

      // Then try to verify as a JWT token (legacy)
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
            req.tenantId = user.tenantId || null;
            logger.info('User authenticated as student:', req.user.id);

            // Cache the user with role-specific key
            const cacheKey = `${token}:student`;
            tokenCache.set(cacheKey, {
              user,
              role: 'student',
              tenantId: req.tenantId,
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
            const resolvedRole = user.role || 'teacher';
            req.user = user;
            req.user.role = resolvedRole;
            req.teacher = user;
            req.tenantId = user.tenantId || null;
            logger.info('User authenticated as teacher:', req.user.id, 'role:', resolvedRole);

            // Cache under the token's literal 'teacher' key (matches the lookup key above),
            // but store the live resolved role so promotions (hod/dean/etc) are reflected.
            const cacheKey = `${token}:teacher`;
            tokenCache.set(cacheKey, {
              user,
              role: resolvedRole,
              tenantId: req.tenantId,
              expiresAt: Date.now() + CACHE_TTL
            });

            return next();
          }
        } else if (role === 'admin') {
          // Support both legacy tokens (using admin numeric id) and new tokens (using username)
          user = await Admin.findOne({ 
            where: { username: decoded.id },
            attributes: { exclude: ['password'] }
          });
          if (!user) {
            // Fallback: try by primary key id if decoded.id was numeric ID
            user = await Admin.findOne({
              where: { id: decoded.id },
              attributes: { exclude: ['password'] }
            });
          }
          
          if (user) {
            req.user = user;
            req.user.role = 'admin';
            req.admin = user;
            req.tenantId = user.tenantId || null;
            logger.info('User authenticated as admin:', req.user.username);

            // Cache the user with role-specific key
            const cacheKey = `${token}:admin`;
            tokenCache.set(cacheKey, {
              user,
              role: 'admin',
              tenantId: req.tenantId,
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
            req.tenantId = user.tenantId || null;
            logger.info('User authenticated as student:', req.user.id);

            // Cache the user with role-specific key
            const cacheKey = `${token}:student`;
            tokenCache.set(cacheKey, {
              user,
              role: 'student',
              tenantId: req.tenantId,
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
            const resolvedRole = user.role || 'teacher';
            req.user = user;
            req.user.role = resolvedRole;
            req.teacher = user;
            req.tenantId = user.tenantId || null;
            logger.info('User authenticated as teacher:', req.user.id, 'role:', resolvedRole);

            // Cache under the token's literal 'teacher' key (matches the lookup key above),
            // but store the live resolved role so promotions (hod/dean/etc) are reflected.
            const cacheKey = `${token}:teacher`;
            tokenCache.set(cacheKey, {
              user,
              role: resolvedRole,
              tenantId: req.tenantId,
              expiresAt: Date.now() + CACHE_TTL
            });

            return next();
          }

          // Finally try admin model (by username first, then id fallback)
          user = await Admin.findOne({ 
            where: { username: decoded.id },
            attributes: { exclude: ['password'] }
          }) || await Admin.findOne({
            where: { id: decoded.id },
            attributes: { exclude: ['password'] }
          });

          if (user) {
            req.user = user;
            req.user.role = 'admin';
            req.admin = user;
            req.tenantId = user.tenantId || null;
            logger.info('User authenticated as admin:', req.user.username);

            // Cache the user with role-specific key
            const cacheKey = `${token}:admin`;
            tokenCache.set(cacheKey, {
              user,
              role: 'admin',
              tenantId: req.tenantId,
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
        if (isDev) logger.debug(`JWT token verification error: ${jwtError.message}`);
        throw new Error('Invalid token format');
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

// Account roster management is available to the institution super-admin and COE.
// It deliberately excludes ordinary faculty roles.
const adminOrCoe = (req, res, next) => {
  if (req.user && ['admin', 'master_admin', 'coe'].includes(req.user.role)) return next();
  res.status(403);
  throw new Error('Only a Master Admin or COE can manage accounts');
};

// Middleware to check if user is a teacher (or a promoted teacher sub-role -- hod/dean/
// assistant_dean/programme_coordinator/coe are all rows in the same Teacher table)
const teacher = (req, res, next) => {
  if (req.user && (TEACHER_SUBROLES.includes(req.user.role) || req.user.role === 'admin')) {
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

// Generic middleware to require specific roles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }
    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (allowedRoles.includes(userRole) || userRole === 'admin') {
      next();
    } else {
      res.status(403);
      throw new Error(`Not authorized. Requires one of: ${allowedRoles.join(', ')}`);
    }
  };
};

// Scope-sensitive role check: queries UserRoleAssignment directly instead of trusting
// the cached req.user.role string, which only ever holds one "primary" role even when a
// teacher has multiple simultaneous grants. `resolveScope(req)` returns the scope filter
// (e.g. `{ departmentId: req.params.id }`) the caller's active grant must match.
//
//   router.post('/:subjectId/handouts', protect, requireScopedRole('hod', req => ({ subjectId: req.params.subjectId })), ...)
//
const requireScopedRole = (role, resolveScope) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authorized');
    }
    if (req.user.role === 'admin') return next(); // superuser bypass, consistent with requireRole

    const scope = (typeof resolveScope === 'function' ? resolveScope(req) : {}) || {};
    const identityConditions = [{ teacherId: req.user.id }];
    if (req.user.email) identityConditions.push({ userId: req.user.email.toLowerCase() });

    const grant = await UserRoleAssignment.findOne({
      where: {
        tenantId: req.tenantId,
        role,
        status: 'active',
        ...scope,
        [Op.or]: identityConditions
      }
    });

    if (grant) return next();

    res.status(403);
    throw new Error(`Not authorized. Requires an active '${role}' grant for this scope.`);
  });
};

module.exports = { protect, admin, adminOnly, adminOrCoe, teacher, student, requireRole, requireScopedRole };
