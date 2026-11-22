const asyncHandler = require('express-async-handler');
const { TeachingAssignment, Section, Subject } = require('../models');

/**
 * Middleware to enforce that a teacher holds a valid teaching assignment 
 * for the requested scope (subject, section, sessionType).
 * 
 * @param {string|array} requiredSessionTypes - e.g. 'lecture' or ['lecture', 'lab']
 */
const requireTeachingAssignment = (requiredSessionTypes) => {
  return asyncHandler(async (req, res, next) => {
    // Assuming req.user is set by authMiddleware
    if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'ta')) {
      res.status(403);
      throw new Error('Access denied: Teacher or TA role required');
    }

    const { subjectId, sectionId } = req.params; // or req.body depending on route

    if (!subjectId) {
      res.status(400);
      throw new Error('Missing subjectId for assignment verification');
    }

    // Build query to find matching assignment
    const whereClause = {
      teacherId: req.user.id,
      subjectId,
      isActive: true
    };

    if (sectionId) {
      whereClause.sectionId = sectionId;
    }

    // TeachingAssignment has no tenantId column of its own -- it inherits tenant scope
    // transitively through teacherId/subjectId, which are already tenant-owned.
    const assignments = await TeachingAssignment.findAll({
      where: whereClause
    });

    if (!assignments || assignments.length === 0) {
      res.status(403);
      throw new Error('Access denied: No active teaching assignment found for this scope');
    }

    // If specific session types are required, verify at least one matches
    if (requiredSessionTypes) {
      const allowedTypes = Array.isArray(requiredSessionTypes) ? requiredSessionTypes : [requiredSessionTypes];
      const hasValidSession = assignments.some(a => allowedTypes.includes(a.sessionType));
      
      if (!hasValidSession) {
        res.status(403);
        throw new Error(`Access denied: Required session type (${allowedTypes.join(', ')}) not found in your assignments`);
      }
    }

    // Attach assignments to req for downstream controllers to use if needed
    req.teachingAssignments = assignments;
    next();
  });
};

module.exports = { requireTeachingAssignment };
