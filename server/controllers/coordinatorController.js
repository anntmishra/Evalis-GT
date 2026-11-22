const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { Student, Batch, Semester, Specialization, SectionGroup, UserRoleAssignment } = require('../models');

// Resolve which batchIds this program coordinator currently holds an active grant for.
const getAssignedBatchIds = async (teacherId, tenantId) => {
  const grants = await UserRoleAssignment.findAll({
    where: { tenantId, teacherId, role: 'programme_coordinator', status: 'active' }
  });
  return grants.map((g) => g.batchId).filter(Boolean);
};

const assertCanManageStudent = async (req, res, student) => {
  if (req.user.role === 'admin') return;
  const batchIds = await getAssignedBatchIds(req.user.id, req.tenantId);
  if (!batchIds.includes(student.batch)) {
    res.status(403);
    throw new Error('Not authorized: this student is outside your assigned batch(es)');
  }
};

// @desc    List students across every batch this coordinator is assigned to
// @route   GET /api/coordinator/students
// @access  Private (Programme Coordinator)
const getMyStudents = asyncHandler(async (req, res) => {
  const batchIds = req.user.role === 'admin' && req.query.batchId
    ? [req.query.batchId]
    : await getAssignedBatchIds(req.user.id, req.tenantId);

  if (batchIds.length === 0) {
    return res.json([]);
  }

  const students = await Student.findAll({
    where: { batch: { [Op.in]: batchIds } },
    attributes: { exclude: ['password'] },
    include: [
      { model: Batch, attributes: ['id', 'name'] },
      { model: Specialization, attributes: ['id', 'name', 'code'] },
      { model: SectionGroup, attributes: ['id', 'name'] },
    ],
    order: [['name', 'ASC']]
  });

  res.json(students);
});

// @desc    Get one student's full detail
// @route   GET /api/coordinator/students/:id
// @access  Private (Programme Coordinator, scoped to their batch(es))
const getStudentDetail = asyncHandler(async (req, res) => {
  const student = await Student.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
    include: [
      { model: Batch, attributes: ['id', 'name'] },
      { model: Specialization, attributes: ['id', 'name', 'code'] },
      { model: SectionGroup, attributes: ['id', 'name'] },
    ]
  });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  await assertCanManageStudent(req, res, student);

  res.json(student);
});

// @desc    Update a student's roster details -- name, email, batch, section, group, specialization
// @route   PUT /api/coordinator/students/:id
// @access  Private (Programme Coordinator, scoped to their batch(es))
const updateStudent = asyncHandler(async (req, res) => {
  const { name, email, batch: newBatchId, section, sectionGroupId, specializationId } = req.body;

  const student = await Student.findByPk(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Authorization is checked against the student's *current* batch before any change --
  // a coordinator can only reach in from a batch they're assigned to, even though the
  // edit itself may move the student to a different batch.
  await assertCanManageStudent(req, res, student);

  if (name !== undefined) student.name = name;
  if (section !== undefined) student.section = section;
  if (specializationId !== undefined) student.specializationId = specializationId || null;

  if (sectionGroupId !== undefined) {
    if (sectionGroupId) {
      const group = await SectionGroup.findByPk(sectionGroupId);
      if (!group) {
        res.status(400);
        throw new Error(`Section group '${sectionGroupId}' not found`);
      }
    }
    student.sectionGroupId = sectionGroupId || null;
  }

  if (email !== undefined && email !== student.email) {
    student.email = email;
    // The old clerkId <-> email pairing no longer applies to this identity -- clear it so
    // the next login re-resolves cleanly against the new email instead of silently keeping
    // a stale link (see mapClerkUserToLocal's email-fallback + clerkId-backfill logic).
    student.clerkId = null;
  }

  if (newBatchId !== undefined && newBatchId !== student.batch) {
    const targetBatch = await Batch.findByPk(newBatchId);
    if (!targetBatch) {
      res.status(400);
      throw new Error(`Batch '${newBatchId}' not found`);
    }
    student.batch = newBatchId;
    // Moving batches invalidates the old lecture-group membership (groups are scoped to a
    // specific batch+semester); the coordinator on the destination batch assigns a new one.
    student.sectionGroupId = null;
  }

  await student.save();

  const updated = await Student.findByPk(student.id, {
    attributes: { exclude: ['password'] },
    include: [
      { model: Batch, attributes: ['id', 'name'] },
      { model: Specialization, attributes: ['id', 'name', 'code'] },
      { model: SectionGroup, attributes: ['id', 'name'] },
    ]
  });

  res.json(updated);
});

const assertCanManageBatch = async (req, res, batchId) => {
  if (req.user.role === 'admin') return;
  const batchIds = await getAssignedBatchIds(req.user.id, req.tenantId);
  if (!batchIds.includes(batchId)) {
    res.status(403);
    throw new Error('Not authorized: you are not the coordinator for this batch');
  }
};

// @desc    List lecture groups for a batch/semester, with member counts
// @route   GET /api/coordinator/section-groups?batchId=X&semesterId=Y
// @access  Private (Programme Coordinator, scoped to their batch(es))
const getSectionGroups = asyncHandler(async (req, res) => {
  const { batchId, semesterId } = req.query;
  if (!batchId || !semesterId) {
    res.status(400);
    throw new Error('batchId and semesterId are required');
  }

  await assertCanManageBatch(req, res, batchId);

  const groups = await SectionGroup.findAll({
    where: { batchId, semesterId },
    order: [['name', 'ASC']]
  });

  const counts = await Student.findAll({
    where: { batch: batchId, sectionGroupId: { [Op.in]: groups.map((g) => g.id) } },
    attributes: ['sectionGroupId', [Student.sequelize.fn('COUNT', Student.sequelize.col('id')), 'count']],
    group: ['sectionGroupId'],
    raw: true
  });
  const countByGroup = new Map(counts.map((c) => [c.sectionGroupId, Number(c.count)]));

  res.json(groups.map((g) => ({ ...g.get({ plain: true }), studentCount: countByGroup.get(g.id) || 0 })));
});

// @desc    Create a lecture group for a batch/semester (e.g. combining 4 sections of 30
//          into a 120-student lecture group)
// @route   POST /api/coordinator/section-groups
// @access  Private (Programme Coordinator, scoped to their batch(es))
const createSectionGroup = asyncHandler(async (req, res) => {
  const { name, batchId, semesterId } = req.body;

  if (!name || !batchId || !semesterId) {
    res.status(400);
    throw new Error('Please provide name, batchId, and semesterId');
  }

  await assertCanManageBatch(req, res, batchId);

  const batch = await Batch.findByPk(batchId);
  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }
  const semester = await Semester.findByPk(semesterId);
  if (!semester) {
    res.status(404);
    throw new Error('Semester not found');
  }

  const group = await SectionGroup.create({ name, batchId, semesterId });
  res.status(201).json(group);
});

// @desc    List specializations (reference data for the student-edit dropdown)
// @route   GET /api/coordinator/specializations
// @access  Private (Programme Coordinator)
const getSpecializations = asyncHandler(async (req, res) => {
  const specializations = await Specialization.findAll({
    where: { isActive: true },
    attributes: ['id', 'name', 'code', 'departmentId'],
    order: [['name', 'ASC']]
  });
  res.json(specializations);
});

module.exports = {
  getMyStudents,
  getStudentDetail,
  updateStudent,
  getSectionGroups,
  createSectionGroup,
  getSpecializations,
};
