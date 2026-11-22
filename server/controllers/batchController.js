const asyncHandler = require('express-async-handler');
const { Batch, Student, UserRoleAssignment, Semester, Program, School } = require('../models');
const { academicScope, deny } = require('../utils/academicScope');

/**
 * @desc    Get all batches
 * @route   GET /api/batches
 * @access  Private/Admin, Teacher
 */
const getAllBatches = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  const batches = await Batch.findAll({
    where: { id: scope.batchIds },
    include: [{
      model: UserRoleAssignment,
      as: 'Coordinators',
      required: false,
      where: { role: 'programme_coordinator', status: 'active' }
    }],
    order: [['startYear', 'DESC']]
  });
  res.json(batches);
});

/**
 * @desc    Get batch by ID
 * @route   GET /api/batches/:id
 * @access  Private/Admin, Teacher
 */
const getBatchById = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  if (!scope.batchIds.includes(req.params.id)) throw deny();
  const batch = await Batch.findByPk(req.params.id);
  
  if (batch) {
    res.json(batch);
  } else {
    res.status(404);
    throw new Error('Batch not found');
  }
});

/**
 * @desc    Create a new batch
 * @route   POST /api/batches
 * @access  Private/Admin
 */
const createBatch = asyncHandler(async (req, res) => {
  const { id: requestedId, name, startYear, durationInYears = 4, semestersPerYear = 2, active, programId } = req.body;
  const program = programId && await Program.findByPk(programId, { include: [{ model: School, required: true, where: { tenantId: req.tenantId } }] });
  if (!program) { res.status(400); throw new Error('Select a programme from your institution'); }
  const department = req.body.department || program.name;

  if (!name || !department || startYear == null) {
    res.status(400);
    throw new Error('Required fields: name, department, startYear');
  }

  if (isNaN(Number(startYear))) {
    res.status(400);
    throw new Error('startYear must be numeric');
  }
  
  const endYear = Number(startYear) + Number(durationInYears);

  // Prefer provided ID, otherwise generate canonical format `${startYear}-${endYear}`
  // This aligns with front-end expectation (e.g. 2023-2027) and avoids legacy BTech2023 pattern.
  let id = (requestedId || '').trim();
  if (!id) {
    id = `${department}-${startYear}-${endYear}`;
  }

  // Ensure ID uniqueness
  const existingById = await Batch.findByPk(id);
  if (existingById) {
    res.status(400);
    throw new Error(`Batch with id '${id}' already exists`);
  }

  // Ensure name uniqueness (allow same name only if pointing to same id)
  const existingByName = await Batch.findOne({ where: { name } });
  if (existingByName) {
    res.status(400);
    throw new Error(`Batch with name '${name}' already exists`);
  }

  const batch = await Batch.create({
    id,
    name,
    department,
    departmentId: program.departmentId,
    programId: program.id,
    startYear,
    endYear,
    durationInYears,
    semestersPerYear,
    active: active !== undefined ? active : true
  });

  // Automatically generate semesters
  const totalSemesters = durationInYears * semestersPerYear;
  const semestersToCreate = [];

  for (let i = 1; i <= totalSemesters; i++) {
    const isOdd = i % 2 !== 0; // Assuming 2 semesters per year, odd = Fall, even = Spring
    const yearOffset = Math.floor((i - 1) / semestersPerYear);
    const academicYearStart = Number(startYear) + yearOffset;
    
    // Default Calendar (can be customized later):
    // Odd semesters (1, 3, 5, 7): Aug 1 to Dec 15
    // Even semesters (2, 4, 6, 8): Jan 15 to May 30
    let startDate, endDate;
    if (isOdd) {
      startDate = new Date(academicYearStart, 7, 1); // Aug 1
      endDate = new Date(academicYearStart, 11, 15); // Dec 15
    } else {
      startDate = new Date(academicYearStart + 1, 0, 15); // Jan 15 of next year
      endDate = new Date(academicYearStart + 1, 4, 30); // May 30 of next year
    }

    const termName = isOdd ? 'Fall' : 'Spring';
    const yearStr = isOdd ? academicYearStart : academicYearStart + 1;
    
    semestersToCreate.push({
      id: `${id}-SEM${i}`,
      name: `Semester ${i} (${termName} ${yearStr})`,
      number: i,
      startDate,
      endDate,
      active: i === 1, // Only make the first one active initially
      batchId: batch.id
    });
  }

  if (semestersToCreate.length > 0) {
    await Semester.bulkCreate(semestersToCreate);
  }

  return res.status(201).json({ ...batch.toJSON(), generatedSemesters: totalSemesters });
});

/**
 * @desc    Update a batch
 * @route   PUT /api/batches/:id
 * @access  Private/Admin
 */
const updateBatch = asyncHandler(async (req, res) => {
  const { name, department, startYear, endYear, active, programId } = req.body;
  const program = programId && await Program.findByPk(programId, { include: [{ model: School, required: true, where: { tenantId: req.tenantId } }] });
  if (programId && !program) throw deny('Programme outside this institution');

  const scope = await academicScope(req);
  if (!scope.batchIds.includes(req.params.id)) throw deny();
  const batch = await Batch.findByPk(req.params.id);
  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  // Validate years if provided
  const newStart = startYear != null ? Number(startYear) : batch.startYear;
  const newEnd = endYear != null ? Number(endYear) : batch.endYear;
  if (isNaN(newStart) || isNaN(newEnd)) {
    res.status(400);
    throw new Error('startYear and endYear must be numeric');
  }
  if (newEnd <= newStart) {
    res.status(400);
    throw new Error('End year must be greater than start year');
  }

  // Ensure name uniqueness
  if (name && name !== batch.name) {
    const conflict = await Batch.findOne({ where: { name } });
    if (conflict) {
      res.status(400);
      throw new Error(`Batch with name '${name}' already exists`);
    }
  }

  batch.name = name || batch.name;
  batch.department = department || (program && program.name) || batch.department;
  if (program) { batch.programId = program.id; batch.departmentId = program.departmentId; }
  batch.startYear = newStart;
  batch.endYear = newEnd;
  if (active !== undefined) batch.active = active;

  const updatedBatch = await batch.save();
  return res.json(updatedBatch);
});

/**
 * @desc    Delete a batch
 * @route   DELETE /api/batches/:id
 * @access  Private/Admin
 */
const deleteBatch = asyncHandler(async (req, res) => {
  const scope = await academicScope(req); if (!scope.batchIds.includes(req.params.id)) throw deny();
  const batch = await Batch.findByPk(req.params.id);
  
  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }
  
  // TODO: Check if there are students or submissions associated with this batch
  // before deletion, or implement soft delete
  
  if (await Student.count({ where: { batch: batch.id, tenantId: req.tenantId } }) || await Semester.count({ where: { batchId: batch.id } })) { res.status(409); throw new Error('This session has students or semesters and cannot be deleted'); }
  await batch.destroy();
  res.json({ message: 'Batch removed' });
});

/**
 * @desc    Get students in batch
 * @route   GET /api/batches/:id/students
 * @access  Private/Admin, Teacher
 */
const getBatchStudents = asyncHandler(async (req, res) => {
  const scope = await academicScope(req); if (!scope.batchIds.includes(req.params.id)) throw deny();
  const batch = await Batch.findByPk(req.params.id);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const students = await Student.findAll({
    where: { batch: req.params.id, tenantId: req.tenantId },
    attributes: { exclude: ['password'] }
  });
  
  res.json(students);
});

module.exports = {
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchStudents,
}; 