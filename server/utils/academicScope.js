const { Op } = require('sequelize');
const { Batch, Program, School, Subject, TeachingAssignment, UserRoleAssignment, Teacher } = require('../models');

function deny(message = 'This resource is outside your academic scope') {
  const error = new Error(message); error.statusCode = 403; return error;
}
async function academicScope(req) {
  if (req.academicScope) return req.academicScope;
  if (!req.tenantId) throw deny('Account has no institution');
  const batches = await Batch.findAll({ include: [{ model: Program, required: true, include: [{ model: School, required: true, where: { tenantId: req.tenantId } }] }] });
  const subjects = await Subject.findAll({ where: { batchId: { [Op.in]: batches.map(row => row.id) } } });
  const grants = await UserRoleAssignment.findAll({ where: { teacherId: String(req.user.id), tenantId: req.tenantId, status: 'active' } });
  const teaching = await TeachingAssignment.findAll({ where: { teacherId: String(req.user.id), isActive: true } });
  const role = req.user.role;
  const permitted = subjects.filter(subject => {
    const batch = batches.find(row => row.id === subject.batchId);
    if (['admin', 'coe'].includes(role)) return true;
    if (role === 'student') return req.user.batch === subject.batchId;
    if (teaching.some(row => row.subjectId === subject.id)) return true;
    return grants.some(grant => {
      if (!['dean', 'assistant_dean', 'hod', 'programme_coordinator'].includes(grant.role)) return false;
      if (!(grant.schoolId || grant.departmentId || grant.batchId || grant.subjectId || grant.semesterId || grant.programId)) return false;
      return (!grant.schoolId || grant.schoolId === batch.Program.schoolId)
        && (!grant.departmentId || grant.departmentId === batch.departmentId)
        && (!grant.programId || grant.programId === batch.programId)
        && (!grant.batchId || grant.batchId === batch.id)
        && (!grant.subjectId || grant.subjectId === subject.id)
        && (!grant.semesterId || grant.semesterId === subject.semesterId);
    });
  });
  // Staff must be able to configure an assigned batch before its first subject exists.
  const allowedBatches = batches.filter(batch => ['admin','coe'].includes(role)
    || (role === 'student' && req.user.batch === batch.id)
    || permitted.some(subject => subject.batchId === batch.id)
    || grants.some(grant => !grant.subjectId && !grant.semesterId && (grant.batchId || grant.departmentId || grant.schoolId || grant.programId)
      && (!grant.batchId || grant.batchId === batch.id) && (!grant.departmentId || grant.departmentId === batch.departmentId)
      && (!grant.schoolId || grant.schoolId === batch.Program.schoolId) && (!grant.programId || grant.programId === batch.programId)));
  req.academicScope = { subjects: permitted, batches: allowedBatches, subjectIds: permitted.map(row => row.id), batchIds: allowedBatches.map(row => row.id), grants };
  return req.academicScope;
}
async function requireSubject(req, id, { manage = false } = {}) {
  const scope = await academicScope(req);
  if (!scope.subjectIds.includes(id)) throw deny();
  if (manage && !['admin','coe','dean','assistant_dean','hod','programme_coordinator'].includes(req.user.role)) throw deny('Academic management permission required');
  return scope.subjects.find(row => row.id === id);
}
async function requireTeacher(req, id) {
  const row = await Teacher.findOne({ where: { id, tenantId: req.tenantId } });
  if (!row) throw deny('Teacher is outside this institution');
  return row;
}
module.exports = { academicScope, requireSubject, requireTeacher, deny };
