const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentSubmissions,
  getCurrentStudentSubmissions,
  getStudentSubjects,
  getCurrentStudentSubjects,
  importStudents,
  importStudentsFromExcel,
  getStudentProfile
} = require('../controllers/studentController');
const { getStudentAssignmentsByParam } = require('../controllers/assignmentController');
const { protect, admin, adminOrCoe, student } = require('../middleware/authMiddleware');
const { importAcademicWorkbook } = require('../controllers/bulkImportController');

// Student routes
router.route('/')
  .get(protect, admin, getStudents)
  .post(protect, adminOrCoe, createStudent);

router.route('/profile')
  .get(protect, student, getStudentProfile);

router.route('/subjects')
  .get(protect, student, getCurrentStudentSubjects);

router.route('/submissions')
  .get(protect, student, getCurrentStudentSubmissions);

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.route('/import')
  .post(protect, admin, (_req, res) => res.status(410).json({ message: 'JSON credential import was retired. Use the secure Excel import endpoint.' }));

router.route('/import-excel')
  .post(protect, admin, upload.single('file'), (req, _res, next) => { req.body.mode = 'students'; next(); }, importAcademicWorkbook);

router.route('/:id')
  .get(protect, getStudentById)
  .put(protect, admin, updateStudent)
  .delete(protect, admin, deleteStudent);

router.route('/:id/submissions')
  .get(protect, getStudentSubmissions);

router.route('/:id/subjects')
  .get(protect, getStudentSubjects);

router.route('/:id/assignments')
  .get(protect, getStudentAssignmentsByParam);

module.exports = router; 
