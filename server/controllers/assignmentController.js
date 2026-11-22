const asyncHandler = require('express-async-handler');
const { Assignment, Teacher, Subject, Submission, Student, sequelize } = require('../models');
const { Op } = require('sequelize');
const { academicScope, requireSubject, deny } = require('../utils/academicScope');
const includes = [{ model: Teacher, attributes: ['id', 'name'] }, { model: Subject, attributes: ['id', 'name', 'section', 'batchId', 'semesterId'] }];
const display = row => { const value = row.toJSON(); return { ...value, subject: value.Subject || null, teacher: value.Teacher || null }; };
const displaySubmission = row => { const value = row.toJSON(); return { ...value, student: value.Student || null }; };
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
async function lookup(req) {
  const row = await Assignment.findByPk(req.params.id, { include: includes });
  if (!row) throw fail('Assignment not found', 404);
  await requireSubject(req, row.subjectId);
  return row;
}
function mayEdit(req, row) {
  if (req.user.role !== 'admin' && row.teacherId !== req.user.id) throw deny('Only the assignment author can edit it');
}
async function studentAssignments(req, studentId) {
  const student = await Student.findOne({ where: { id: studentId, tenantId: req.tenantId } });
  if (!student) throw fail('Student not found', 404);
  if (req.user.role === 'student' && studentId !== req.user.id) throw deny();
  const scope = await academicScope(req);
  const subjectIds = scope.subjects.filter(s => s.batchId === student.batch && (!student.activeSemesterId || !s.semesterId || s.semesterId === student.activeSemesterId)).map(s => s.id);
  const assignments = await Assignment.findAll({ where: { subjectId: { [Op.in]: subjectIds } }, include: includes, order: [['createdAt', 'DESC']] });
  const submissions = await Submission.findAll({ where: { tenantId: req.tenantId, studentId, assignmentId: { [Op.in]: assignments.map(a => a.id) } } });
  return assignments.map(row => {
    const submission = submissions.find(s => s.assignmentId === row.id);
    const visible = submission?.gradingState === 'published';
    return {
      ...display(row),
      submitted: !!submission,
      submissionId: submission?.id || null,
      submittedAt: submission?.submissionDate || null,
      submissionFileUrl: submission?.fileUrl || null,
      gradingState: submission ? (visible ? 'published' : submission.graded ? 'awaiting_publication' : 'submitted') : 'not_submitted',
      grade: visible ? submission.score : null,
      letterGrade: visible ? submission.letterGrade : null,
      feedback: visible ? submission.feedback : '',
      graded: Boolean(visible && submission.graded)
    };
  });
}
const getAssignments = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  res.json(await Assignment.findAll({ where: { subjectId: { [Op.in]: scope.subjectIds } }, include: includes, order: [['createdAt', 'DESC']] }));
});
const getStudentAssignments = asyncHandler(async (req, res) => res.json(await studentAssignments(req, req.user.id)));
const getStudentAssignmentsByParam = asyncHandler(async (req, res) => res.json(await studentAssignments(req, req.params.id)));
const getTeacherAssignments = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  const rows = await Assignment.findAll({ where: { teacherId: req.user.id, subjectId: { [Op.in]: scope.subjectIds } }, include: includes, order: [['createdAt', 'DESC']] });
  res.json(rows.map(display));
});
const getAssignmentById = asyncHandler(async (req, res) => {
  const row = await lookup(req);
  if (req.user.role === 'student') return res.json((await studentAssignments(req, req.user.id)).find(a => a.id === row.id) || (() => { throw deny(); })());
  res.json(display(row));
});
const createAssignment = asyncHandler(async (req, res) => {
  const { title, description, subjectId, examType, dueDate, fileUrl } = req.body;
  if (!title?.trim() || !subjectId || !examType) throw fail('Title, subject and assessment type are required');
  await requireSubject(req, subjectId);
  if (dueDate && !Number.isFinite(Date.parse(dueDate))) throw fail('Invalid due date');
  // Assignment authors must have a faculty identity (the author FK references Teacher).
  const author = await Teacher.findOne({ where: { id: String(req.user.id), tenantId: req.tenantId } });
  if (!author) throw deny('A faculty account must create assignments');
  res.status(201).json(await Assignment.create({ title: title.trim(), description: description || '', subjectId, teacherId: author.id, examType, dueDate: dueDate || null, fileUrl: fileUrl || null }));
});
const updateAssignment = asyncHandler(async (req, res) => {
  const row = await lookup(req); mayEdit(req, row);
  const fields = {};
  for (const key of ['title', 'description', 'examType', 'dueDate', 'fileUrl']) if (req.body[key] !== undefined) fields[key] = req.body[key];
  if (fields.dueDate && !Number.isFinite(Date.parse(fields.dueDate))) throw fail('Invalid due date');
  res.json(await row.update(fields));
});
const deleteAssignment = asyncHandler(async (req, res) => {
  const row = await lookup(req); mayEdit(req, row);
  if (await Submission.count({ where: { assignmentId: row.id } })) throw fail('An assignment with submissions cannot be deleted', 409);
  await row.destroy();
  res.json({ message: 'Assignment removed' });
});
const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const row = await lookup(req);
  const rows = await Submission.findAll({ where: { assignmentId: row.id, tenantId: req.tenantId }, include: [{ model: Student, attributes: ['id', 'name', 'section', 'batch'] }], order: [['submissionDate', 'DESC']] });
  res.json(rows.map(displaySubmission));
});
module.exports = { getAssignments, getStudentAssignments, getStudentAssignmentsByParam, getTeacherAssignments, getAssignmentById, createAssignment, updateAssignment, deleteAssignment, getAssignmentSubmissions };
