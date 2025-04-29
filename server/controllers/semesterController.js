const asyncHandler = require('express-async-handler');
const { Semester, Batch, Subject, Student } = require('../models');

// @desc    Create a new semester
// @route   POST /api/semesters
// @access  Private/Admin
const createSemester = asyncHandler(async (req, res) => {
  const { batchId, name, number, startDate, endDate, active } = req.body;

  // Validate batch exists
  const batchExists = await Batch.findByPk(batchId);
  if (!batchExists) {
    res.status(404);
    throw new Error('Batch not found');
  }

  // Check if semester number already exists for this batch
  const existingSemester = await Semester.findOne({
    where: {
      batchId,
      number
    }
  });

  if (existingSemester) {
    res.status(400);
    throw new Error(`Semester ${number} already exists for this batch`);
  }

  // Generate semester ID
  const semesterId = await Semester.generateSemesterId(batchId, number);

  // Create semester
  const semester = await Semester.create({
    id: semesterId,
    name,
    number,
    startDate,
    endDate,
    active: active || true,
    batchId
  });

  res.status(201).json(semester);
});

// @desc    Get all semesters
// @route   GET /api/semesters
// @access  Private
const getSemesters = asyncHandler(async (req, res) => {
  const semesters = await Semester.findAll({
    include: [
      {
        model: Batch,
        attributes: ['id', 'name', 'department']
      }
    ],
    order: [
      ['createdAt', 'DESC']
    ]
  });

  res.json(semesters);
});

// @desc    Get semester by ID
// @route   GET /api/semesters/:id
// @access  Private
const getSemesterById = asyncHandler(async (req, res) => {
  const semester = await Semester.findByPk(req.params.id, {
    include: [
      {
        model: Batch,
        attributes: ['id', 'name', 'department']
      },
      {
        model: Subject,
        attributes: ['id', 'name', 'credits', 'description']
      }
    ]
  });

  if (!semester) {
    res.status(404);
    throw new Error('Semester not found');
  }

  res.json(semester);
});

// @desc    Update semester
// @route   PUT /api/semesters/:id
// @access  Private/Admin
const updateSemester = asyncHandler(async (req, res) => {
  const semester = await Semester.findByPk(req.params.id);

  if (!semester) {
    res.status(404);
    throw new Error('Semester not found');
  }

  const { name, startDate, endDate, active } = req.body;

  semester.name = name || semester.name;
  semester.startDate = startDate || semester.startDate;
  semester.endDate = endDate || semester.endDate;
  
  // Only update active if explicitly provided
  if (active !== undefined) {
    semester.active = active;
  }

  const updatedSemester = await semester.save();

  res.json(updatedSemester);
});

// @desc    Set active semester for students
// @route   PUT /api/semesters/:id/set-active
// @access  Private/Admin
const setActiveSemesterForStudents = asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  const semesterId = req.params.id;

  // Validate semester exists
  const semester = await Semester.findByPk(semesterId);
  if (!semester) {
    res.status(404);
    throw new Error('Semester not found');
  }

  // Validate the students belong to the same batch as the semester
  const students = await Student.findAll({
    where: {
      id: studentIds
    }
  });

  if (students.length !== studentIds.length) {
    res.status(400);
    throw new Error('One or more students not found');
  }

  // Update students' active semester
  await Promise.all(
    students.map(student => 
      student.update({ activeSemesterId: semesterId })
    )
  );

  res.json({ message: `Active semester updated for ${students.length} students` });
});

// @desc    Get semesters for a specific batch
// @route   GET /api/semesters/batch/:batchId
// @access  Private
const getBatchSemesters = asyncHandler(async (req, res) => {
  const batchId = req.params.batchId;
  
  // Validate batch exists
  const batchExists = await Batch.findByPk(batchId);
  if (!batchExists) {
    res.status(404);
    throw new Error('Batch not found');
  }
  
  const semesters = await Semester.findAll({
    where: { batchId },
    include: [
      {
        model: Batch,
        attributes: ['id', 'name', 'department']
      }
    ],
    order: [
      ['number', 'ASC']
    ]
  });
  
  res.json(semesters);
});

module.exports = {
  createSemester,
  getSemesters,
  getSemesterById,
  updateSemester,
  setActiveSemesterForStudents,
  getBatchSemesters
}; 