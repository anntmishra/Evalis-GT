const express = require('express');
const router = express.Router();
const {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectsBySection,
  getSubjectsByBatch,
  getSubjectsBySemester
} = require('../controllers/subjectController');
const { protect, admin } = require('../middleware/authMiddleware');

// Subject routes
router.route('/')
  .get(protect, getSubjects)
  .post(protect, admin, createSubject);

router.route('/:id')
  .get(protect, getSubjectById)
  .put(protect, admin, updateSubject)
  .delete(protect, admin, deleteSubject);

// Get subjects by section
router.route('/section/:sectionId')
  .get(protect, getSubjectsBySection);

// Get subjects by batch
router.route('/batch/:batchId')
  .get(protect, getSubjectsByBatch);

// Get subjects by semester
router.route('/semester/:semesterId')
  .get(protect, getSubjectsBySemester);

module.exports = router; 