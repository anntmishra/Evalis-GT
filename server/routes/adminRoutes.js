const express = require('express');
const router = express.Router();
const {
  addStudentsBatch,
  addTeacher,
  assignSubjectToTeacher,
  getTeacherSubjectAssignments,
  generateSemestersForBatch,
  setActiveSemesterForStudent,
  setActiveSemesterForBatch
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes use the protect middleware to ensure authentication
// and the admin middleware to ensure only admins can access these routes
router.use(protect);
router.use(admin);

// Admin routes for managing students and teachers
router.post('/students/batch', addStudentsBatch);
router.post('/teachers', addTeacher);
router.post('/assign/subject', assignSubjectToTeacher);
router.get('/assignments', getTeacherSubjectAssignments);

// Semester management routes
router.post('/semesters/generate/:batchId', generateSemestersForBatch);
router.post('/semesters/:semesterId/student/:studentId', setActiveSemesterForStudent);
router.post('/semesters/:semesterId/batch/:batchId', setActiveSemesterForBatch);

module.exports = router; 