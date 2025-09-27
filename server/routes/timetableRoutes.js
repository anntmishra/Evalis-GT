const express = require('express');
const router = express.Router();

const { protect, admin, teacher, student } = require('../middleware/authMiddleware');
const {
  triggerGeneration,
  getAllTimetables,
  getTimetable,
  changeTimetableStatus,
  removeTimetable,
  getMyTeacherTimetable,
  getMyStudentTimetable,
  getTimetableSlots
} = require('../controllers/timetableController');

router.use(protect);

router.get('/teacher/me', teacher, getMyTeacherTimetable);
router.get('/student/me', student, getMyStudentTimetable);

router.get('/', admin, getAllTimetables);
router.post('/generate', admin, triggerGeneration);

router.get('/:id/slots', admin, getTimetableSlots);
router.patch('/:id/status', admin, changeTimetableStatus);
router.delete('/:id', admin, removeTimetable);
router.get('/:id', admin, getTimetable);

module.exports = router;