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
  getSubjectsBySemester,
  importSubjectsFromExcel
} = require('../controllers/subjectController');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for memory storage (for parsing Excel in-memory)
const upload = multer({ storage: multer.memoryStorage() });

// Subject routes
// NOTE: Order matters. Specific prefixed routes must be declared BEFORE the generic '/:id'
// to avoid Express treating 'section' | 'batch' | 'semester' as an :id parameter.

router.route('/import-excel')
  .post(protect, admin, upload.single('file'), importSubjectsFromExcel);

router.route('/')
  .get(protect, getSubjects)
  .post(protect, admin, createSubject);

// Specific collection filters FIRST
router.route('/section/:sectionId')
  .get(protect, getSubjectsBySection);

router.route('/batch/:batchId')
  .get(protect, getSubjectsByBatch);

router.route('/semester/:semesterId')
  .get(protect, getSubjectsBySemester);

// Generic id route LAST
router.route('/:id')
  .get(protect, getSubjectById)
  .put(protect, admin, updateSubject)
  .delete(protect, admin, deleteSubject);

module.exports = router; 