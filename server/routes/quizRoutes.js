const express = require('express');
const router = express.Router();
const {
  createQuiz,
  getTeacherQuizzes,
  getStudentQuizzes,
  getQuizById,
  startQuizAttempt,
  submitQuizAttempt,
  getQuizResults,
  getQuizAttempts,
  updateQuiz,
  deleteQuiz
} = require('../controllers/quizController');
const { protect, teacher, student } = require('../middleware/authMiddleware');

// Student routes - MUST come before :id routes
router.get('/student', protect, student, getStudentQuizzes);
router.post('/:id/start', protect, student, startQuizAttempt);
router.post('/:id/submit', protect, student, submitQuizAttempt);
router.get('/:id/results', protect, student, getQuizResults);

// Teacher routes
router.post('/', protect, teacher, createQuiz);
router.get('/', protect, teacher, getTeacherQuizzes);
router.get('/:id/attempts', protect, teacher, getQuizAttempts);

// Shared routes - put :id routes last
router.get('/:id', protect, getQuizById);
router.put('/:id', protect, teacher, updateQuiz);
router.delete('/:id', protect, teacher, deleteQuiz);

module.exports = router;
