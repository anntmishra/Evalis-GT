const express = require('express');
const router = express.Router();
const {
  createSemester,
  getSemesters,
  getSemesterById,
  updateSemester,
  setActiveSemesterForStudents,
  getBatchSemesters
} = require('../controllers/semesterController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getSemesters);
router.get('/batch/:batchId', getBatchSemesters);
router.get('/:id', getSemesterById);

// Protected routes - Admin only
router.post('/', protect, adminOnly, createSemester);
router.put('/:id', protect, adminOnly, updateSemester);
router.put('/:id/set-active', protect, adminOnly, setActiveSemesterForStudents);

module.exports = router; 