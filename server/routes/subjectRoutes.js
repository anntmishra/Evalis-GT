const express = require('express');
const router = express.Router();
const {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
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

module.exports = router; 