const asyncHandler = require('express-async-handler');
const { Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer, Student, Teacher, Subject, Batch } = require('../models');
const { Op } = require('sequelize');

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

  // Calculate total marks
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  // Create quiz
  const quiz = await Quiz.create({
    title,
    description,
    teacherId: req.user.id,
    subjectId,
    batchId,
    timeLimit: timeLimit || 60,
    totalMarks,
    passingMarks: passingMarks || Math.floor(totalMarks * 0.4),
    startDate,
    endDate,
    isPublished: isPublished || false,
    isActive: true,
    allowMultipleAttempts: allowMultipleAttempts || false,
    maxAttempts: maxAttempts || 1,
    shuffleQuestions: shuffleQuestions || false,
    showResultsImmediately: showResultsImmediately !== undefined ? showResultsImmediately : true,
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
    where: { teacherId: req.user.id },
    include: [
      { model: Subject, attributes: ['id', 'name', 'section'] },
      { model: Batch, attributes: ['id', 'name'] },
      {
        model: QuizQuestion,
        attributes: ['id'],
        include: [{ model: QuizOption, attributes: ['id'] }]
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  res.json(quizzes);
});

// @desc    Get available quizzes for student
// @route   GET /api/quizzes/student
// @access  Student only
const getStudentQuizzes = asyncHandler(async (req, res) => {
  const student = await Student.findByPk(req.user.id);
  
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const now = new Date();
  
  console.log('Student batch:', student.batch);
  console.log('Current date:', now);
  
  // 1. Get active quizzes (whether attempted or not)
  const activeQuizzes = await Quiz.findAll({
    where: {
      batchId: student.batch,
      isPublished: true,
      isActive: true,
      startDate: { [Op.lte]: now },
      endDate: { [Op.gte]: now }
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

  // 2. Get all quizzes that have been attempted by this student (including past ones)
  const attemptedQuizzes = await Quiz.findAll({
    where: {
      batchId: student.batch,
      isPublished: true,
      isActive: true
    },
    include: [
      { model: Subject, attributes: ['id', 'name', 'section'] },
      { model: Teacher, attributes: ['id', 'name'] },
      {
        model: QuizAttempt,
        where: { studentId: req.user.id },
        required: true, // Must have an attempt
        attributes: ['id', 'attemptNumber', 'score', 'passed', 'submittedAt', 'status']
      }
    ],
    order: [['startDate', 'DESC']]
  });

  // Merge results to avoid duplicates
  const quizMap = new Map();
  
  activeQuizzes.forEach(q => quizMap.set(q.id, q));
  attemptedQuizzes.forEach(q => quizMap.set(q.id, q));
  
  const combinedQuizzes = Array.from(quizMap.values());
  
  // Sort by startDate DESC
  combinedQuizzes.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  console.log(`Found ${combinedQuizzes.length} quizzes for student (${activeQuizzes.length} active, ${attemptedQuizzes.length} attempted)`);

  res.json(combinedQuizzes);
});

// @desc    Get quiz by ID with questions
// @route   GET /api/quizzes/:id
// @access  Teacher (own quiz) or Student (published quiz)
const getQuizById = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByPk(req.params.id, {
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

  // Check access
  const isTeacher = req.user.role === 'teacher' && quiz.teacherId === req.user.id;
  const isStudent = req.user.role === 'student' && quiz.isPublished;

  if (!isTeacher && !isStudent) {
    res.status(403);
    throw new Error('Not authorized to access this quiz');
  }

  res.json(quiz);
});

// @desc    Start quiz attempt
// @route   POST /api/quizzes/:id/start
// @access  Student only
const startQuizAttempt = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByPk(req.params.id);

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

  if (attempt.studentId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized');
  }

  if (attempt.status !== 'in_progress') {
    res.status(400);
    throw new Error('Quiz already submitted');
  }

  let totalScore = 0;

  // Process each answer
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

  res.json(completeAttempt);
});

// @desc    Get quiz results for student
// @route   GET /api/quizzes/:id/results
// @access  Student only
const getQuizResults = asyncHandler(async (req, res) => {
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
  const quiz = await Quiz.findByPk(req.params.id);

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

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Teacher only
const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByPk(req.params.id);

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
    await quiz.update(req.body);
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
  const quiz = await Quiz.findByPk(req.params.id);

  if (!quiz) {
    res.status(404);
    throw new Error('Quiz not found');
  }

  if (quiz.teacherId !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to delete this quiz');
  }

  await quiz.destroy();

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
  updateQuiz,
  deleteQuiz
};
