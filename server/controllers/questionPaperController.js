const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { sequelize, QuestionPaper, Subject, Teacher, TeachingAssignment } = require('../models');
const { academicScope, requireSubject, deny } = require('../utils/academicScope');

const include = [
  { model: Subject, attributes: ['id', 'name', 'batchId', 'semesterId'] },
  { model: Teacher, attributes: ['id', 'name', 'email'] },
];

function validatePaper(body) {
  const title = String(body.title || '').trim();
  const examType = String(body.examType || '').trim();
  const durationMinutes = Number(body.durationMinutes);
  const questions = Array.isArray(body.questions) ? body.questions : [];
  if (!title || !body.subjectId || !examType) throw Object.assign(new Error('Title, subject, and exam type are required.'), { statusCode: 400 });
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) throw Object.assign(new Error('Duration must be a positive whole number of minutes.'), { statusCode: 400 });
  if (!questions.length) throw Object.assign(new Error('Add at least one question before submitting.'), { statusCode: 400 });
  const invalid = questions.some(question => !String(question.text || '').trim() || !Number.isFinite(Number(question.marks)) || Number(question.marks) <= 0);
  if (invalid) throw Object.assign(new Error('Every question needs text and marks greater than zero.'), { statusCode: 400 });
  return { title, examType, durationMinutes, questions, totalMarks: questions.reduce((sum, question) => sum + Number(question.marks), 0) };
}

const createPaper = asyncHandler(async (req, res) => {
  const validated = validatePaper(req.body);
  const subject = await requireSubject(req, req.body.subjectId);
  const assigned = await TeachingAssignment.findOne({ where: { teacherId: String(req.user.id), subjectId: subject.id, isActive: true } });
  if (!assigned && req.user.role !== 'admin') throw deny('You can submit papers only for subjects actively assigned to you.');
  const submit = req.body.submitForApproval !== false;
  const paper = await QuestionPaper.create({
    ...validated,
    subjectId: subject.id,
    batchId: subject.batchId,
    teacherId: String(req.user.id),
    tenantId: req.tenantId,
    questions: validated.questions,
    courseOutcomes: Array.isArray(req.body.courseOutcomes) ? req.body.courseOutcomes : [],
    status: submit ? 'pending_hod' : 'draft',
    submittedAt: submit ? new Date() : null,
    reviewHistory: submit ? [{ action: 'submitted', stage: 'hod', actorId: String(req.user.id), actorRole: req.user.role, at: new Date().toISOString(), comment: '' }] : [],
  });
  res.status(201).json(await QuestionPaper.findByPk(paper.id, { include }));
});

const myPapers = asyncHandler(async (req, res) => {
  res.json(await QuestionPaper.findAll({ where: { tenantId: req.tenantId, teacherId: String(req.user.id) }, include, order: [['updatedAt', 'DESC']] }));
});

const getPaper = asyncHandler(async (req, res) => {
  const paper = await QuestionPaper.findOne({ where: { id: req.params.id, tenantId: req.tenantId }, include });
  if (!paper) return res.status(404).json({ message: 'Question paper not found.' });
  const scope = await academicScope(req);
  if (paper.teacherId !== String(req.user.id) && !scope.subjectIds.includes(paper.subjectId)) throw deny();
  res.json(paper);
});

const updatePaper = asyncHandler(async (req, res) => {
  const paper = await QuestionPaper.findOne({ where: { id: req.params.id, tenantId: req.tenantId, teacherId: String(req.user.id) } });
  if (!paper) return res.status(404).json({ message: 'Question paper not found.' });
  if (!['draft', 'changes_requested'].includes(paper.status)) return res.status(409).json({ message: 'Only drafts or papers returned for changes can be edited.' });
  const validated = validatePaper({ ...req.body, subjectId: req.body.subjectId || paper.subjectId });
  const subject = await requireSubject(req, req.body.subjectId || paper.subjectId);
  const submit = req.body.submitForApproval === true;
  const history = [...(paper.reviewHistory || [])];
  if (submit) history.push({ action: 'resubmitted', stage: 'hod', actorId: String(req.user.id), actorRole: req.user.role, at: new Date().toISOString(), comment: '' });
  await paper.update({
    ...validated, subjectId: subject.id, batchId: subject.batchId,
    questions: validated.questions,
    courseOutcomes: Array.isArray(req.body.courseOutcomes) ? req.body.courseOutcomes : paper.courseOutcomes,
    status: submit ? 'pending_hod' : 'draft', submittedAt: submit ? new Date() : paper.submittedAt,
    version: paper.version + 1, reviewHistory: history,
  });
  res.json(await QuestionPaper.findByPk(paper.id, { include }));
});

const approvalQueue = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  const finalReviewer = ['coe', 'admin'].includes(req.user.role);
  const status = finalReviewer ? 'pending_coe' : 'pending_hod';
  const rows = await QuestionPaper.findAll({
    where: { tenantId: req.tenantId, status, subjectId: { [Op.in]: scope.subjectIds } },
    include, order: [['submittedAt', 'ASC']],
  });
  res.json(rows);
});

const decidePaper = asyncHandler(async (req, res) => {
  const action = String(req.body.action || '').toLowerCase();
  const comment = String(req.body.comment || '').trim();
  if (!['approve', 'request_changes', 'reject'].includes(action)) return res.status(400).json({ message: 'Choose approve, request_changes, or reject.' });
  if (action !== 'approve' && !comment) return res.status(400).json({ message: 'A comment is required when requesting changes or rejecting.' });

  const updated = await sequelize.transaction(async transaction => {
    const paper = await QuestionPaper.findOne({ where: { id: req.params.id, tenantId: req.tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!paper) throw Object.assign(new Error('Question paper not found.'), { statusCode: 404 });
    await requireSubject(req, paper.subjectId, { manage: true });
    if (paper.teacherId === String(req.user.id)) throw deny('You cannot approve your own question paper.');
    const finalReviewer = ['coe', 'admin'].includes(req.user.role);
    const expected = finalReviewer ? 'pending_coe' : 'pending_hod';
    if (paper.status !== expected) throw Object.assign(new Error('This paper is no longer at your approval stage.'), { statusCode: 409 });
    const nextStatus = action === 'approve' ? (finalReviewer ? 'approved' : 'pending_coe') : action === 'request_changes' ? 'changes_requested' : 'rejected';
    const history = [...(paper.reviewHistory || []), {
      action, stage: finalReviewer ? 'coe' : 'hod', actorId: String(req.user.id), actorRole: req.user.role,
      at: new Date().toISOString(), comment,
    }];
    await paper.update({ status: nextStatus, reviewedAt: new Date(), reviewHistory: history }, { transaction });
    return paper;
  });
  res.json({ success: true, id: updated.id, status: updated.status });
});

module.exports = { createPaper, myPapers, getPaper, updatePaper, approvalQueue, decidePaper };
