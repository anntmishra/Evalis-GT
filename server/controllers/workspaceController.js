const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');
const { sequelize, Student, Teacher, Subject, Submission, Quiz, Assignment, StudentSubjectGrade, RoleRequest, CourseHandout, QuizQuestion, QuizOption } = require('../models');
const { academicScope, requireSubject, deny } = require('../utils/academicScope');

const catalog = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  const teachers = req.user.role === 'student' ? [] : await Teacher.findAll({ where: { tenantId: req.tenantId }, attributes: ['id','name','email','role'] });
  res.json({ batches: scope.batches, subjects: scope.subjects, teachers, examTypes: [{ id: 'Assignment', name: 'Assignment' }, { id: 'Quiz', name: 'Quiz' }, { id: 'Midterm', name: 'Midterm' }, { id: 'Final', name: 'Final' }] });
});
const overview = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  const where = { tenantId: req.tenantId, subjectId: { [Op.in]: scope.subjectIds }, ...(req.user.role === 'student' ? { studentId: req.user.id } : {}) };
  const [students, submissions, assignments, quizzes, teachers] = await Promise.all([
    Student.count({ where: { tenantId: req.tenantId, batch: { [Op.in]: scope.batchIds }, ...(req.user.role === 'student' ? { id: req.user.id } : {}) } }),
    Submission.findAll({ where, attributes: ['id','assignmentId','studentId','score','graded','gradingState','createdAt'], order: [['createdAt','DESC']] }),
    Assignment.count({ where: { subjectId: { [Op.in]: scope.subjectIds } } }),
    Quiz.count({ where: { tenantId: req.tenantId, subjectId: { [Op.in]: scope.subjectIds } } }),
    Teacher.count({ where: { tenantId: req.tenantId } }),
  ]);
  const published = submissions.filter(row => row.gradingState === 'published');
  res.json({ students, teachers, subjects: scope.subjectIds.length, batches: scope.batchIds.length, assignments, quizzes, pendingGrades: submissions.filter(row => !row.graded).length, awaitingPublication: submissions.filter(row => row.graded && row.gradingState === 'submitted').length, published: published.length,
    recentActivity: submissions.slice(0,5).map(row => ({ id: row.id, text: row.gradingState === 'published' ? 'Result published' : row.graded ? 'Grading completed' : 'Submission received', time: row.createdAt, student: row.studentId })) });
});
const results = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  const submissions = await Submission.findAll({ where: { tenantId: req.tenantId, subjectId: { [Op.in]: scope.subjectIds } }, include: [{ model: Student, attributes: ['id','batch'] }] });
  res.json(scope.batches.map(batch => {
    const rows = submissions.filter(row => row.Student?.batch === batch.id);
    const graded = rows.filter(row => row.graded && row.score != null);
    const published = rows.filter(row => row.gradingState === 'published');
    const blocked = rows.some(row => ['draft','disputed'].includes(row.gradingState));
    return { id: batch.id, batchName: batch.name, semester: `${batch.startYear}–${batch.endYear}`, totalStudents: new Set(rows.map(row => row.studentId)).size, totalSubmissions: rows.length, gradedPercentage: rows.length ? Math.round(graded.length / rows.length * 100) : 0, status: !rows.length ? 'no-data' : published.length === rows.length ? 'published' : graded.length === rows.length && !blocked ? 'ready' : 'grading' };
  }));
});
const publish = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  if (!scope.batchIds.includes(req.params.batchId)) throw deny();
  const subjectIds = scope.subjects.filter(row => row.batchId === req.params.batchId).map(row => row.id);
  let count = 0;
  await sequelize.transaction(async transaction => {
    const rows = await Submission.findAll({ where: { tenantId: req.tenantId, subjectId: { [Op.in]: subjectIds } }, transaction, lock: transaction.LOCK.UPDATE });
    if (!rows.length || rows.some(row => !row.graded || row.score == null || ['draft','disputed'].includes(row.gradingState))) { const error = new Error('Every submission must be graded and ready before publishing'); error.statusCode = 409; throw error; }
    for (const row of rows) { if (row.gradingState !== 'published') { await row.update({ gradingState: 'published' }, { transaction }); count++; } }

  });
  res.json({ success: true, published: count });
});
const approvals = asyncHandler(async (req, res) => {
  const scope = await academicScope(req);
  const quizzes = await Quiz.findAll({ where: { tenantId: req.tenantId, subjectId: { [Op.in]: scope.subjectIds }, isPublished: false }, include: [{ model: Subject, attributes: ['id','name'] }, { model: Teacher, attributes: ['id','name'] }] });
  res.json(quizzes.map(row => ({ id: row.id, subjectCode: row.subjectId, subjectName: row.Subject?.name || row.title, type: 'Quiz', submittedBy: row.Teacher?.name || row.teacherId, submittedAt: row.createdAt })));
});
const approvalPreview = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId }, include: [{ model: QuizQuestion, include: [QuizOption] }, { model: Subject, attributes: ['id','name'] }, { model: Teacher, attributes: ['id','name'] }] });
  if (!quiz) { res.status(404); throw new Error('Assessment not found'); }
  await requireSubject(req, quiz.subjectId, { manage: true });
  res.json(quiz);
});
const approve = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!quiz) { res.status(404); throw new Error('Quiz not found'); }
  await requireSubject(req, quiz.subjectId, { manage: true });
  const questions = await QuizQuestion.count({ where: { quizId: quiz.id } });
  if (!questions || new Date(quiz.endDate) <= new Date(quiz.startDate)) { const error = new Error('Assessment needs questions and a valid date range before approval'); error.statusCode = 409; throw error; }
  await quiz.update({ isPublished: true, isActive: true });
  res.json({ success: true });
});
module.exports = { catalog, overview, results, publish, approvals, approvalPreview, approve };
