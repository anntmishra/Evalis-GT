const asyncHandler = require('express-async-handler');
const {
  generateTimetable,
  listTimetables,
  getTimetableById,
  updateTimetableStatus,
  deleteTimetable,
  getTeacherTimetable,
  getStudentTimetable,
  createManualTimetableSlot,
  updateManualTimetableSlot,
  removeManualTimetableSlot
} = require('../services/timetableService');

const { Timetable, TimetableSlot } = require('../models');

const triggerGeneration = asyncHandler(async (req, res) => {
  const { semesterId, batchId, options = {}, dryRun = false, name } = req.body || {};
  const generatedBy = req.user?.id || 'system';

  const result = await generateTimetable({
    semesterId,
    batchId,
    generatedBy,
    metadataOverrides: options,
    dryRun,
    name
  });

  res.status(dryRun ? 200 : 201).json({
    success: true,
    dryRun,
    data: result
  });
});

const getAllTimetables = asyncHandler(async (req, res) => {
  const { semesterId, batchId, status, includeSlots } = req.query;
  const timetables = await listTimetables({
    semesterId,
    batchId,
    status,
    includeSlots: includeSlots === 'true'
  });

  res.json({ success: true, data: timetables });
});

const getTimetable = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const timetable = await getTimetableById(id);
  res.json({ success: true, data: timetable });
});

const changeTimetableStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updated = await updateTimetableStatus(id, status);
  res.json({ success: true, data: updated });
});

const removeTimetable = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteTimetable(id);
  res.json({ success: true });
});

const getMyTeacherTimetable = asyncHandler(async (req, res) => {
  const timetable = await getTeacherTimetable(req.teacher.id);
  res.json({ success: true, data: timetable });
});

const getMyStudentTimetable = asyncHandler(async (req, res) => {
  const timetable = await getStudentTimetable(req.student.id);
  res.json({ success: true, data: timetable });
});

const getTimetableSlots = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const slots = await TimetableSlot.findAll({
    where: { timetableId: id },
    order: [['dayOfWeek', 'ASC'], ['slotIndex', 'ASC']]
  });
  res.json({ success: true, data: slots });
});

const createSlot = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const slot = await createManualTimetableSlot(id, req.body);
  res.status(201).json({ success: true, data: slot });
});

const updateSlot = asyncHandler(async (req, res) => {
  const { id, slotId } = req.params;
  const slot = await updateManualTimetableSlot(id, slotId, req.body);
  res.json({ success: true, data: slot });
});

const deleteSlot = asyncHandler(async (req, res) => {
  const { id, slotId } = req.params;
  await removeManualTimetableSlot(id, slotId);
  res.json({ success: true });
});

module.exports = {
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
};