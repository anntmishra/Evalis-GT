const express = require('express');
const router = express.Router();
const {
  getSubmissions,
  getSubmissionById,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getSubmissionsBySubject
} = require('../controllers/submissionController');
const { protect, admin, teacher, student } = require('../middleware/authMiddleware');

// Submission routes
router.route('/')
  .get(protect, admin, getSubmissions)
  .post(protect, student, createSubmission);

router.route('/:id')
  .get(protect, getSubmissionById)
  .put(protect, teacher, updateSubmission)
  .delete(protect, admin, deleteSubmission);

router.route('/subject/:subjectId')
  .get(protect, teacher, getSubmissionsBySubject);

module.exports = router; 