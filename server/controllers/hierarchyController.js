const asyncHandler = require('express-async-handler');
const { UserRoleAssignment, Department, Batch, Teacher, School } = require('../models');
const crypto = require('crypto');
const { linkAndRecomputeRole } = require('../services/roleCacheService');

// @desc    Assign HOD to a department
// @route   POST /api/hierarchy/assign-hod
// @access  Private (COE)
const assignHod = asyncHandler(async (req, res) => {
  const { departmentId, email } = req.body;
  const tenantId = req.tenantId;

  if (!departmentId || !email) {
    res.status(400);
    throw new Error('Please provide departmentId and email');
  }

  // Verify department exists
  const dept = await Department.findByPk(departmentId, { include: [{ model: School, required: true, where: { tenantId } }] });
  if (!dept) {
    res.status(404);
    throw new Error('Department not found');
  }

  // Using email as a temporary userId for invite flow,
  // until they sign up, at which point the webhook or auth sync maps this.
  const userId = email.toLowerCase();

  // Check if assignment already exists
  const existing = await UserRoleAssignment.findOne({
    where: { tenantId, departmentId, role: 'hod', status: 'active' }
  });

  if (existing) {
    // Update existing HOD
    existing.userId = userId;
    await existing.save();
    await linkAndRecomputeRole(existing, email, tenantId);
    return res.status(200).json({ success: true, data: existing });
  }

  // Create new role assignment
  const assignment = await UserRoleAssignment.create({
    id: crypto.randomUUID(),
    userId,
    role: 'hod',
    departmentId,
    tenantId,
    grantedBy: req.user?.id || null,
    grantedAt: new Date()
  });

  await linkAndRecomputeRole(assignment, email, tenantId);

  res.status(201).json({ success: true, data: assignment });
});

// @desc    Assign Program Coordinator to a batch
// @route   POST /api/hierarchy/assign-coordinator
// @access  Private (HOD)
const assignCoordinator = asyncHandler(async (req, res) => {
  const { batchId, email } = req.body;
  const tenantId = req.tenantId;

  if (!batchId || !email) {
    res.status(400);
    throw new Error('Please provide batchId and email');
  }

  // Verify batch exists
  const batch = await Batch.findByPk(batchId);
  const { academicScope } = require('../utils/academicScope');
  const scope = await academicScope(req);
  if (!scope.batchIds.includes(batchId)) { res.status(403); throw new Error('Batch is outside your academic scope'); }
  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const userId = email.toLowerCase();

  const existing = await UserRoleAssignment.findOne({
    where: { tenantId, batchId, role: 'programme_coordinator', status: 'active' }
  });

  if (existing) {
    existing.userId = userId;
    await existing.save();
    await linkAndRecomputeRole(existing, email, tenantId);
    return res.status(200).json({ success: true, data: existing });
  }

  const assignment = await UserRoleAssignment.create({
    id: crypto.randomUUID(),
    userId,
    role: 'programme_coordinator',
    batchId,
    departmentId: batch.departmentId, // Link to parent department implicitly
    tenantId,
    grantedBy: req.user?.id || null,
    grantedAt: new Date()
  });

  await linkAndRecomputeRole(assignment, email, tenantId);

  res.status(201).json({ success: true, data: assignment });
});

// @desc    Get user's role assignments (Scope lookup)
// @route   GET /api/hierarchy/me
// @access  Private
const getMyAssignments = asyncHandler(async (req, res) => {
  // Try matching by Clerk ID or Email
  const clerkId = req.user?.id || req.user?.clerkId;
  const email = req.user?.email?.toLowerCase() || req.user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

  let assignments = [];

  if (clerkId || email) {
    // Find all assignments where userId matches either clerkId or email
    const { Op } = require('sequelize');
    const conditions = [];
    if (clerkId) { conditions.push({ userId: clerkId }); conditions.push({ teacherId: String(clerkId) }); }
    if (email) conditions.push({ userId: email });

    if (conditions.length > 0) {
      assignments = await UserRoleAssignment.findAll({
        where: { tenantId: req.tenantId, status: 'active', [Op.or]: conditions }
      });
    }
  }

  res.status(200).json({ assignments });
});

// @desc    Assign Dean to a school
// @route   POST /api/hierarchy/assign-dean
// @access  Private (Master Admin)
const assignDean = asyncHandler(async (req, res) => {
  const { schoolId, email, role } = req.body;
  const targetRole = role === 'assistant_dean' ? 'assistant_dean' : 'dean';
  const tenantId = req.tenantId;

  if (!schoolId || !email) {
    res.status(400);
    throw new Error('Please provide schoolId and email');
  }

  // Verify school exists
  const school = await School.findOne({ where: { id: schoolId, tenantId } });
  if (!school) {
    res.status(404);
    throw new Error('School not found');
  }

  const userId = email.toLowerCase();

  // Check if assignment already exists
  const existing = await UserRoleAssignment.findOne({
    where: { tenantId, schoolId, role: targetRole, status: 'active' }
  });

  let assignment = existing;
  if (existing) {
    // Update existing
    existing.userId = userId;
    await existing.save();
  } else {
    // Create new
    assignment = await UserRoleAssignment.create({
      userId,
      schoolId,
      role: targetRole,
      tenantId,
      grantedBy: req.user?.id || null,
      grantedAt: new Date()
    });
  }

  await linkAndRecomputeRole(assignment, email, tenantId);

  res.status(200).json({ message: `${targetRole === 'dean' ? 'Dean' : 'Assistant Dean'} assigned successfully`, email, schoolId, role: targetRole });
});

// @desc    Assign COE (Controller of Examinations)
// @route   POST /api/hierarchy/assign-coe
// @access  Private (MasterAdmin)
const assignCoe = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const tenantId = req.tenantId;

  if (!email) {
    res.status(400);
    throw new Error('Please provide email');
  }

  const userId = email.toLowerCase();

  // COE is a tenant-wide role (no specific schoolId/programId), but the platform
  // allows any number of COEs per tenant, so we don't dedupe on an existing row here --
  // each assignment call creates a distinct grant.
  const assignment = await UserRoleAssignment.create({
    id: crypto.randomUUID(),
    userId,
    role: 'coe',
    tenantId,
    grantedBy: req.user?.id || null,
    grantedAt: new Date()
  });

  await linkAndRecomputeRole(assignment, email, tenantId);

  res.status(201).json({ success: true, data: assignment });
});

module.exports = {
  assignHod,
  assignCoordinator,
  assignDean,
  assignCoe,
  getMyAssignments
};
