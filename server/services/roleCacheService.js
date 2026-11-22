const { Teacher, UserRoleAssignment } = require('../models');
const { Op } = require('sequelize');

// Coarse precedence for the single cached Teacher.role field -- highest org-wide authority
// wins when a teacher holds multiple simultaneous active grants (e.g. HOD of one subject
// while also Programme Coordinator of a batch). This cache exists for cheap coarse
// checks/UI badges only; scope-sensitive authorization must query UserRoleAssignment
// directly via requireScopedRole, never trust this cached string alone.
const ROLE_PRECEDENCE = ['super_admin', 'dean', 'assistant_dean', 'coe', 'programme_coordinator', 'hod'];

/**
 * Recompute and persist a teacher's cached `role` from their active UserRoleAssignment
 * grants. Call this after any grant/revoke instead of writing Teacher.role directly.
 */
const recomputeTeacherRole = async (teacherId, tenantId) => {
  const teacher = await Teacher.findByPk(teacherId);
  if (!teacher) return null;

  const grants = await UserRoleAssignment.findAll({
    where: {
      tenantId,
      status: 'active',
      [Op.or]: [
        { teacherId: teacher.id },
        ...(teacher.email ? [{ userId: teacher.email.toLowerCase() }] : [])
      ]
    }
  });

  let effectiveRole = 'teacher';
  for (const precedenceRole of ROLE_PRECEDENCE) {
    if (grants.some((g) => g.role === precedenceRole)) {
      effectiveRole = precedenceRole;
      break;
    }
  }

  if (teacher.role !== effectiveRole) {
    teacher.role = effectiveRole;
    await teacher.save();
  }

  return teacher;
};

/**
 * Link a UserRoleAssignment grant to the Teacher row it belongs to (once they've signed
 * up) and recompute the cached role. No-op if the person hasn't signed up yet -- the grant
 * row (keyed by email in userId) still serves as the pending-invite record for that case.
 */
const linkAndRecomputeRole = async (assignment, email, tenantId) => {
  const teacher = await Teacher.findOne({ where: { email: email.toLowerCase(), tenantId } });
  if (!teacher) return null;

  if (assignment.teacherId !== teacher.id) {
    assignment.teacherId = teacher.id;
    await assignment.save();
  }

  return recomputeTeacherRole(teacher.id, tenantId);
};

module.exports = { ROLE_PRECEDENCE, recomputeTeacherRole, linkAndRecomputeRole };
