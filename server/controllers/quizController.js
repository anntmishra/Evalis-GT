const asyncHandler = require('express-async-handler');
const { sequelize, Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer, Student, Teacher, Subject, Batch } = require('../models');
const { Op } = require('sequelize');
const redisConfig = require('../config/redis');
const queueService = require('../services/queueService');
const { academicScope, requireSubject, deny } = require('../utils/academicScope');

// @desc    Create a new quiz
// @route   POST /api/quizzes
// @access  Teacher only
const createQuiz = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    subjectId,
    batchId,
    timeLimit,
    passingMarks,
    startDate,
    endDate,
    isPublished,
    allowMultipleAttempts,
    maxAttempts,
    shuffleQuestions,
    showResultsImmediately,
    instructions,
    questions
  } = req.body;

  // Validate required fields
  if (!title || !subjectId || !batchId || !startDate || !endDate || !questions || questions.length === 0) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }
  const invalidQuestion = questions.some(question =>
    !question.questionText?.trim()
    || !Array.isArray(question.options)
    || question.options.length < 2
    || question.options.some(option => !option.optionText?.trim())
    || question.options.filter(option => option.isCorrect === true).length !== 1
  );
  if (invalidQuestion) {
    res.status(400);
    throw new Error('Every question needs text, at least two options, and exactly one correct answer');
  }

  const subject = await requireSubject(req, subjectId);
  if (subject.batchId !== batchId) { res.status(400); throw new Error('Subject does not belong to the selected batch'); }
  if (new Date(endDate) <= new Date(startDate)) { res.status(400); throw new Error('Invalid quiz date range'); }
  // Calculate total marks
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  // Create quiz
  const quiz = await Quiz.create({
    title,
    description,
    teacherId: req.user.id,
    tenantId: req.tenantId,
    subjectId,
    batchId,
    timeLimit: timeLimit || 60,
    totalMarks,
    passingMarks: passingMarks || Math.floor(totalMarks * 0.4),
    startDate,
    endDate,
    // Basic classroom quizzes are owned by the teacher and do not enter the
    // examination approval queue. Teachers may still explicitly save a draft.
    isPublished: isPublished !== false,
    isActive: true,
    allowMultipleAttempts: allowMultipleAttempts || false,
    maxAttempts: maxAttempts || 1,
    shuffleQuestions: shuffleQuestions || false,
    // Result publication is a separate teacher decision. Until it is released,
    // students can see that they submitted but cannot see marks or answers.
    showResultsImmediately: showResultsImmediately === true,
    instructions
  });

  // Create questions and options
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    
    const question = await QuizQuestion.create({
      quizId: quiz.id,
      questionText: q.questionText,
      questionType: q.questionType || 'multiple_choice',
      marks: q.marks || 1,
      orderIndex: i + 1,
      explanation: q.explanation,
      imageUrl: q.imageUrl
    });

    // Create options
    if (q.options && q.options.length > 0) {
      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        await QuizOption.create({
          questionId: question.id,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect || false,
          orderIndex: j + 1
        });
      }
    }
  }

  // Fetch complete quiz with questions
  const completeQuiz = await Quiz.findByPk(quiz.id, {
    include: [
      {
        model: QuizQuestion,
        include: [QuizOption]
      },
      { model: Teacher, attributes: ['id', 'name', 'email'] },
      { model: Subject, attributes: ['id', 'name', 'section'] },
      { model: Batch, attributes: ['id', 'name'] }
    ]
  });

  res.status(201).json(completeQuiz);
});

// @desc    Get all quizzes for teacher
// @route   GET /api/quizzes
// @access  Teacher only
const getTeacherQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await Quiz.findAll({
    where: { teacherId: req.user.id, tenantId: req.tenantId },
    include: [
      { model: Subject, attributes: ['id', 'name', 'section'] },
      { model: Batch, attributes: ['id', 'name'] },
      {
        model: QuizQuestion,
        attributes: ['id'],
        include: [{ model: QuizOption, attributes: ['id'] }]
      },
      { model: QuizAttempt, attributes: ['id', 'status', 'submittedAt'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json(quizzes);
});

// @desc    Get available quizzes for student
// @route   GET /api/quizzes/student
// @access  Student only
const getStudentQuizzes = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ where: { id: req.user.id, tenantId: req.tenantId } });

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // List every published quiz for the student's batch. Availability is still
  // enforced when an attempt starts, but upcoming and closed quizzes remain
  // visible so publication never appears to have failed.
  const publishedQuizzes = await Quiz.findAll({
    where: {
      batchId: student.batch,
      tenantId: req.tenantId,
      isPublished: true,
      isActive: true
    },
    include: [
      { model: Subject, attributes: ['id', 'name', 'section'] },
      { model: Teacher, attributes: ['id', 'name'] },
      {
        model: QuizAttempt,
        where: { studentId: req.user.id },
        required: false,
        attributes: ['id', 'attemptNumber', 'score', 'passed', 'submittedAt', 'status']
      }
    ],
    order: [['startDate', 'DESC']]
  });

  const safeQuizzes = publishedQuizzes.map(row => {
    const quiz = row.toJSON();
    quiz.resultsPublished = Boolean(quiz.showResultsImmediately);
    if (!quiz.showResultsImmediately) {
      quiz.QuizAttempts = (quiz.QuizAttempts || []).map(attempt => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
        resultsPublished: false
      }));
    }
    return quiz;
  });

  res.json(safeQuizzes);
});

// @desc    Get quiz by ID with questions
// @route   GET /api/quizzes/:id
// @access  Teacher (own quiz) or Student (published quiz)
const getQuizById = asyncHandler(async (req, res) => {
  const cacheKey = `quiz:${req.tenantId}:${req.params.id}`;

  // 1. Check Redis Cache
  let quiz = await redisConfig.get(cacheKey);

  if (quiz) {
    quiz = JSON.parse(quiz);
    console.log(`[Cache Hit] Returning quiz ${req.params.id} from Redis`);
  } else {
    // 2. Fetch from DB
    quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId },
      include: [
        {
          model: QuizQuestion,
          include: [QuizOption],
          order: [['orderIndex', 'ASC']]
        },
        { model: Teacher, attributes: ['id', 'name'] },
        { model: Subject, attributes: ['id', 'name', 'section'] },
        { model: Batch, attributes: ['id', 'name'] }
      ]
    });

    if (!quiz) {
      res.status(404);
      throw new Error('Quiz not found');
    }

    // 3. Cache the fetched result (TTL: 1 hour)
    console.log(`[Cache Miss] Fetching quiz ${req.params.id} from Postgres`);
    await redisConfig.set(cacheKey, JSON.stringify(quiz), 'EX', 3600);
  }

  if (quiz.tenantId !== req.tenantId) throw deny();
  await requireSubject(req, quiz.subjectId);
  // Check access
  const isTeacher = req.user.role !== 'student' && (quiz.teacherId === req.user.id || ['admin','coe'].includes(req.user.role));
  const isStudent = req.user.role === 'student' && quiz.batchId === req.user.batch && quiz.isPublished && quiz.isActive;

  if (!isTeacher && !isStudent) {
    res.status(403);
    throw new Error('Not authorized to access this quiz');
  }

  if (isStudent) { const safe = typeof quiz.toJSON === 'function' ? quiz.toJSON() : { ...quiz }; for (const question of safe.QuizQuestions || []) { delete question.explanation; for (const option of question.QuizOptions || []) delete option.isCorrect; } return res.json(safe); }
  res.json(quiz);
});

// @desc    Start quiz attempt
// @route   POST /api/quizzes/:id/start
// @access  Student only
const startQuizAttempt = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId, batchId: req.user.batch } });

  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  if (!quiz.isPublished || !quiz.isActive) {
    res.status(400);
    throw new Error('Quiz is not available');
  }

  // Check if quiz is within date range
  const now = new Date();
  if (now < new Date(quiz.startDate) || now > new Date(quiz.endDate)) {
    res.status(400);
    throw new Error('Quiz is not currently active');
  }

  // Check previous attempts
  const previousAttempts = await QuizAttempt.findAll({
    where: {
      quizId: quiz.id,
      studentId: req.user.id
    }
  });

  if (!quiz.allowMultipleAttempts && previousAttempts.length > 0) {
    res.status(400);
    throw new Error('You have already attempted this quiz');
  }

  if (quiz.allowMultipleAttempts && previousAttempts.length >= quiz.maxAttempts) {
    res.status(400);
    throw new Error(`Maximum ${quiz.maxAttempts} attempts allowed`);
  }

  // Create new attempt
  const attempt = await QuizAttempt.create({
    quizId: quiz.id,
    studentId: req.user.id,
    attemptNumber: previousAttempts.length + 1,
    totalMarks: quiz.totalMarks,
    status: 'in_progress'
  });

  // Get quiz with questions (don't show correct answers)
  const quizData = await Quiz.findByPk(quiz.id, {
    include: [
      {
        model: QuizQuestion,
        attributes: ['id', 'questionText', 'questionType', 'marks', 'orderIndex', 'imageUrl'],
        include: [{
          model: QuizOption,
          attributes: ['id', 'optionText', 'orderIndex']
        }],
        order: [['orderIndex', 'ASC']]
      }
    ]
  });

  res.status(201).json({
    attempt,
    quiz: quizData
  });
});

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/submit
// @access  Student only
const submitQuizAttempt = asyncHandler(async (req, res) => {
  const { attemptId, answers, timeSpent } = req.body;

  if (!attemptId || !answers) {
    res.status(400);
    throw new Error('Attempt ID and answers are required');
  }

  const attempt = await QuizAttempt.findByPk(attemptId, {
    include: [{ model: Quiz }]
  });

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  if (attempt.Quiz?.tenantId !== req.tenantId || attempt.Quiz?.batchId !== req.user.batch || attempt.Quiz?.id !== req.params.id) throw deny();
  if (attempt.studentId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (attempt.status !== 'in_progress') {
    res.status(400);
    throw new Error('Quiz already submitted');
  }

  // Dispatch grading to background queue if available
  const jobId = await queueService.addQuizGradingJob({
    attemptId: attempt.id,
    answers,
    timeSpent,
    passingMarks: attempt.Quiz.passingMarks
  });

  if (jobId) {
    // Return early, background worker will grade it
    res.status(202).json({
      message: 'Quiz submitted and is being graded',
      attemptId: attempt.id,
      status: 'grading_in_progress'
    });
    return;
  }

  // Fallback: Grade inline if queue is not active
  let totalScore = 0;

  // Process each answer
  for (const answer of answers) {
    const question = await QuizQuestion.findByPk(answer.questionId);
    const selectedOption = await QuizOption.findByPk(answer.selectedOptionId);

    if (!question || !selectedOption || question.quizId !== attempt.Quiz.id || selectedOption.questionId !== question.id) continue;

    const isCorrect = selectedOption.isCorrect;
    const marksAwarded = isCorrect ? question.marks : 0;
    totalScore += marksAwarded;

    await QuizAnswer.create({
      attemptId: attempt.id,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      isCorrect,
      marksAwarded
    });
  }

  // Update attempt
  const passed = totalScore >= attempt.Quiz.passingMarks;
  await attempt.update({
    score: totalScore,
    passed,
    submittedAt: new Date(),
    timeSpent: timeSpent || 0,
    status: 'submitted'
  });

  // Get complete attempt with answers
  const completeAttempt = await QuizAttempt.findByPk(attempt.id, {
    include: [
      {
        model: QuizAnswer,
        include: [
          { model: QuizQuestion },
          { model: QuizOption }
        ]
      },
      { model: Quiz }
    ]
  });

  if (!attempt.Quiz.showResultsImmediately) {
    return res.json({
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      submittedAt: attempt.submittedAt,
      status: attempt.status,
      resultsPublished: false,
      message: 'Quiz submitted. Your teacher has not published the results yet.'
    });
  }

  res.json(completeAttempt);
});

// @desc    Get quiz results for student
// @route   GET /api/quizzes/:id/results
// @access  Student only
const getQuizResults = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId, batchId: req.user.batch } });
  if (!quiz) throw deny();
  if (!quiz.showResultsImmediately) {
    const error = new Error('Quiz results have not been published by the teacher yet');
    error.statusCode = 409;
    throw error;
  }
  const attempts = await QuizAttempt.findAll({
    where: {
      quizId: req.params.id,
      studentId: req.user.id,
      status: 'submitted'
    },
    include: [
      {
        model: QuizAnswer,
        include: [
          { model: QuizQuestion },
          { model: QuizOption }
        ]
      },
      { model: Quiz }
    ],
    order: [['submittedAt', 'DESC']]
  });

  res.json(attempts);
});

// @desc    Get all attempts for a quiz (teacher)
// @route   GET /api/quizzes/:id/attempts
// @access  Teacher only
const getQuizAttempts = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });

  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  if (quiz.teacherId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to view these results');
  }

  const attempts = await QuizAttempt.findAll({
    where: {
      quizId: req.params.id,
      status: 'submitted'
    },
    include: [
      {
        model: Student,
        attributes: ['id', 'name', 'email']
      },
      {
        model: QuizAnswer,
        include: [
          { model: QuizQuestion, attributes: ['id', 'questionText', 'marks'] },
          { model: QuizOption, attributes: ['id', 'optionText'] }
        ]
      }
    ],
    order: [['submittedAt', 'DESC']]
  });

  res.json(attempts);
});

// @desc    Publish a teacher-owned quiz directly to students
// @route   POST /api/quizzes/:id/publish
// @access  Teacher only
const publishQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!quiz) { res.status(404); throw new Error('Quiz not found'); }
  if (quiz.teacherId !== req.user.id) { res.status(403); throw new Error('Not authorized to publish this quiz'); }

  const questions = await QuizQuestion.count({ where: { quizId: quiz.id } });
  if (!questions || new Date(quiz.endDate) <= new Date(quiz.startDate)) {
    const error = new Error('Quiz needs questions and a valid date range before publishing');
    error.statusCode = 409;
    throw error;
  }

  await quiz.update({ isPublished: true, isActive: true });
  await redisConfig.del(`quiz:${req.tenantId}:${quiz.id}`);
  res.json({ success: true, isPublished: true });
});

// @desc    Release auto-graded quiz results to students
// @route   POST /api/quizzes/:id/results/publish
// @access  Teacher only
const publishQuizResults = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });
  if (!quiz) { res.status(404); throw new Error('Quiz not found'); }
  if (quiz.teacherId !== req.user.id) { res.status(403); throw new Error('Not authorized to publish these results'); }

  const submittedAttempts = await QuizAttempt.count({ where: { quizId: quiz.id, status: 'submitted' } });
  if (!submittedAttempts) {
    const error = new Error('There are no completed attempts to publish yet');
    error.statusCode = 409;
    throw error;
  }

  await quiz.update({ showResultsImmediately: true });
  await redisConfig.del(`quiz:${req.tenantId}:${quiz.id}`);
  res.json({ success: true, resultsPublished: true, publishedAttempts: submittedAttempts });
});

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Teacher only
const updateQuiz = asyncHandler(async (req, res) => {
  // Invalidate cache
  await redisConfig.del(`quiz:${req.tenantId}:${req.params.id}`);

  const quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });

  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  if (quiz.teacherId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to update this quiz');
  }

  // Check if quiz has attempts
  const hasAttempts = await QuizAttempt.count({ where: { quizId: quiz.id } }) > 0;
  
  if (hasAttempts) {
    // If quiz has attempts, only allow limited updates
    await quiz.update({
      title: req.body.title || quiz.title,
      description: req.body.description !== undefined ? req.body.description : quiz.description,
      isActive: req.body.isActive !== undefined ? req.body.isActive : quiz.isActive,
      instructions: req.body.instructions !== undefined ? req.body.instructions : quiz.instructions
    });
  } else {
    // Full update allowed if no attempts
    const updates = {}; for (const key of ['title','description','timeLimit','passingMarks','startDate','endDate','isActive','allowMultipleAttempts','maxAttempts','shuffleQuestions','showResultsImmediately','instructions']) if (req.body[key] !== undefined) updates[key] = req.body[key];
    await quiz.update(updates);
  }

  const updatedQuiz = await Quiz.findByPk(quiz.id, {
    include: [
      {
        model: QuizQuestion,
        include: [QuizOption]
      },
      { model: Teacher, attributes: ['id', 'name'] },
      { model: Subject, attributes: ['id', 'name', 'section'] },
      { model: Batch, attributes: ['id', 'name'] }
    ]
  });

  res.json(updatedQuiz);
});

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Teacher only
const deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ where: { id: req.params.id, tenantId: req.tenantId } });

  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  if (quiz.teacherId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to delete this quiz');
  }

  // Remove dependent records in an explicit transaction. Some deployed schemas
  // predate the cascade constraints, so relying on model-level cascade alone can
  // leave a teacher unable to delete a quiz after students have attempted it.
  await sequelize.transaction(async transaction => {
    const questions = await QuizQuestion.findAll({ where: { quizId: quiz.id }, attributes: ['id'], transaction });
    const attempts = await QuizAttempt.findAll({ where: { quizId: quiz.id }, attributes: ['id'], transaction });
    const questionIds = questions.map(row => row.id);
    const attemptIds = attempts.map(row => row.id);

    if (attemptIds.length) await QuizAnswer.destroy({ where: { attemptId: { [Op.in]: attemptIds } }, transaction });
    if (attemptIds.length) await QuizAttempt.destroy({ where: { id: { [Op.in]: attemptIds } }, transaction });
    if (questionIds.length) await QuizOption.destroy({ where: { questionId: { [Op.in]: questionIds } }, transaction });
    if (questionIds.length) await QuizQuestion.destroy({ where: { id: { [Op.in]: questionIds } }, transaction });
    await quiz.destroy({ transaction });
  });
  await redisConfig.del(`quiz:${req.tenantId}:${quiz.id}`);

  res.json({ message: 'Quiz deleted successfully' });
});

module.exports = {
  createQuiz,
  getTeacherQuizzes,
  getStudentQuizzes,
  getQuizById,
  startQuizAttempt,
  submitQuizAttempt,
  getQuizResults,
  getQuizAttempts,
  publishQuiz,
  publishQuizResults,
  updateQuiz,
  deleteQuiz
};

// Initialize background grading worker
if (queueService.isQueueActive) {
  queueService.initWorker(async (jobData) => {
    const { attemptId, answers, timeSpent, passingMarks } = jobData;

    const attempt = await QuizAttempt.findByPk(attemptId, {
      include: [{ model: Quiz }]
    });

    if (!attempt) throw new Error('Attempt not found in worker');

    let totalScore = 0;

    for (const answer of answers) {
      const question = await QuizQuestion.findByPk(answer.questionId);
      const selectedOption = await QuizOption.findByPk(answer.selectedOptionId);

      if (!question || !selectedOption) continue;

      const isCorrect = selectedOption.isCorrect;
      const marksAwarded = isCorrect ? question.marks : 0;
      totalScore += marksAwarded;

      await QuizAnswer.create({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isCorrect,
        marksAwarded
      });
    }

    const passed = totalScore >= passingMarks;
    await attempt.update({
      score: totalScore,
      passed,
      submittedAt: new Date(),
      timeSpent: timeSpent || 0,
      status: 'submitted'
    });
  });
}
