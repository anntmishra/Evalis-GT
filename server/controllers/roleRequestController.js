const asyncHandler = require('express-async-handler');
const { RoleRequest, Teacher, UserRoleAssignment, Notification } = require('../models');
const { recomputeTeacherRole } = require('../services/roleCacheService');

// @desc    Propose a new HOD
// @route   POST /api/role-requests
// @access  Private (Programme Coordinator)
const proposeRole = asyncHandler(async (req, res) => {
  const { targetUserId, requestedRole, departmentId, comments } = req.body;
  const proposerId = req.user.id;
  const tenantId = req.tenantId;

  if (req.user.role !== 'programme_coordinator') {
    res.status(403);
    throw new Error('Only a Programme Coordinator can propose roles.');
  }

  // Check if there is already a pending request for this user and role
  const existingRequest = await RoleRequest.findOne({
    where: { tenantId, targetUserId, requestedRole, deanStatus: 'pending' }
  });

  if (existingRequest) {
    res.status(400);
    throw new Error('There is already a pending request for this role for this user.');
  }

  const roleReq = await RoleRequest.create({
    proposerId,
    targetUserId,
    requestedRole,
    departmentId,
    comments,
    tenantId
  });

  res.status(201).json(roleReq);
});

// @desc    Get pending role requests
// @route   GET /api/role-requests
// @access  Private (Dean/Assistant Dean)
const getRequests = asyncHandler(async (req, res) => {
  const { role } = req.user;

  let query = { tenantId: req.tenantId };
  if (role === 'assistant_dean') {
    // Asst Dean sees level 1 pending requests
    query.assistantDeanStatus = 'pending';
  } else if (role === 'dean') {
    // Dean sees level 2 pending requests (approved by Asst Dean)
    // OR they can see everything if we want, but typically level 2 pending
    query.assistantDeanStatus = 'approved';
    query.deanStatus = 'pending';
  } else {
    res.status(403);
    throw new Error('Unauthorized to view role requests.');
  }

  const requests = await RoleRequest.findAll({
    where: query,
    include: [
      { model: Teacher, as: 'Proposer', attributes: ['id', 'name', 'email'] },
      { model: Teacher, as: 'TargetUser', attributes: ['id', 'name', 'email'] },
    ]
  });

  res.json(requests);
});

// @desc    Approve a role request
// @route   PUT /api/role-requests/:id/approve
// @access  Private (Dean/Assistant Dean)
const approveRequest = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user;
  const { comments } = req.body;
  const tenantId = req.tenantId;

  const roleReq = await RoleRequest.findByPk(req.params.id);

  if (!roleReq) {
    res.status(404);
    throw new Error('Role request not found.');
  }

  if (role === 'assistant_dean') {
    if (roleReq.assistantDeanStatus !== 'pending') {
      res.status(400);
      throw new Error('Request already processed by Assistant Dean.');
    }
    roleReq.assistantDeanStatus = 'approved';
    roleReq.assistantDeanId = userId;
    roleReq.comments = comments ? roleReq.comments + '\nAsst Dean: ' + comments : roleReq.comments;
    await roleReq.save();
    return res.json({ message: 'Level 1 Approval granted by Assistant Dean', roleReq });
  }

  if (role === 'dean') {
    if (roleReq.assistantDeanStatus !== 'approved') {
      res.status(400);
      throw new Error('Cannot approve. Assistant Dean has not approved this yet.');
    }
    if (roleReq.deanStatus !== 'pending') {
      res.status(400);
      throw new Error('Request already processed by Dean.');
    }

    roleReq.deanStatus = 'approved';
    roleReq.deanId = userId;
    roleReq.comments = comments ? roleReq.comments + '\nDean: ' + comments : roleReq.comments;
    await roleReq.save();

    // Actually grant the promoted role
    const targetUser = await Teacher.findByPk(roleReq.targetUserId);
    if (targetUser) {
      await UserRoleAssignment.findOrCreate({
        where: {
          tenantId,
          teacherId: targetUser.id,
          role: roleReq.requestedRole,
          departmentId: roleReq.departmentId,
          status: 'active'
        },
        defaults: {
          userId: (targetUser.email || targetUser.id).toLowerCase(),
          grantedBy: userId,
          grantedAt: new Date()
        }
      });

      await recomputeTeacherRole(targetUser.id, tenantId);

      // Send notification
      await Notification.create({
        userId: targetUser.id,
        title: 'Role Promoted',
        message: `Your role has been upgraded to ${roleReq.requestedRole} by the Dean.`,
        type: 'system',
        tenantId
      });
    }

    return res.json({ message: 'Final Approval granted by Dean', roleReq });
  }

  res.status(403);
  throw new Error('Unauthorized to approve role requests.');
});

// @desc    Reject a role request
// @route   PUT /api/role-requests/:id/reject
// @access  Private (Dean/Assistant Dean)
const rejectRequest = asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user;
  const { comments } = req.body;

  const roleReq = await RoleRequest.findByPk(req.params.id);

  if (!roleReq) {
    res.status(404);
    throw new Error('Role request not found.');
  }

  if (role === 'assistant_dean') {
    roleReq.assistantDeanStatus = 'rejected';
    roleReq.assistantDeanId = userId;
  } else if (role === 'dean') {
    roleReq.deanStatus = 'rejected';
    roleReq.deanId = userId;
  } else {
    res.status(403);
    throw new Error('Unauthorized to reject role requests.');
  }

  roleReq.comments = comments ? roleReq.comments + `\nRejected by ${role}: ` + comments : roleReq.comments;
  await roleReq.save();

  // Send notification back to Proposer
  await Notification.create({
    userId: roleReq.proposerId,
    title: 'Role Proposal Rejected',
    message: `Your proposal for ${roleReq.requestedRole} was rejected by the ${role}.`,
    type: 'system',
    tenantId: req.tenantId
  });

  res.json({ message: 'Request rejected successfully', roleReq });
});

module.exports = {
  proposeRole,
  getRequests,
  approveRequest,
  rejectRequest
};
