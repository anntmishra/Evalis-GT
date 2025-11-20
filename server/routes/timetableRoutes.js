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
  getTimetableSlots,
  createSlot,
  updateSlot,
  deleteSlot
} = require('../controllers/timetableController');

router.use(protect);

router.get('/teacher/me', teacher, getMyTeacherTimetable);
router.get('/student/me', student, getMyStudentTimetable);

router.get('/', admin, getAllTimetables);
router.post('/generate', admin, triggerGeneration);

router.get('/:id/slots', admin, getTimetableSlots);
router.post('/:id/slots', admin, createSlot);
router.patch('/:id/slots/:slotId', admin, updateSlot);
router.delete('/:id/slots/:slotId', admin, deleteSlot);
router.patch('/:id/status', admin, changeTimetableStatus);
router.delete('/:id', admin, removeTimetable);
router.get('/:id', admin, getTimetable);

module.exports = router;