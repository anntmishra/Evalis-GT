const express = require('express');
const router = express.Router();
const {
  getSubmissions,
  getSubmissionById,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  getSubmissionsBySubject,
  getSubmissionsByTeacher,
  submitAssignment
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

// New route to get submissions by teacher
router.route('/teacher/:teacherId')
  .get(protect, teacher, getSubmissionsByTeacher);

// New route to submit an assignment
router.route('/assignment/:id')
  .post(protect, student, submitAssignment);

module.exports = router; 