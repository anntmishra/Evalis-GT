
const Student = require('./studentModel');
const Teacher = require('./teacherModel');
const Subject = require('./subjectModel');
const Batch = require('./batchModel');
const Submission = require('./submissionModel');
const Admin = require('./adminModel');
const TeacherSubject = require('./teacherSubjectModel');
const Semester = require('./semesterModel');
const Assignment = require('./assignmentModel');
const Proposal = require('./proposalModel');
const ProposalVote = require('./proposalVoteModel');
const Notification = require('./notificationModel');
const PasswordResetToken = require('./passwordResetTokenModel');
const Certificate = require('./certificateModel');
const RedemptionHistory = require('./redemptionHistoryModel');
const Timetable = require('./timetableModel');
const TimetableSlot = require('./timetableSlotModel');
const Quiz = require('./quizModel');
const QuizQuestion = require('./quizQuestionModel');
const QuizOption = require('./quizOptionModel');
const QuizAttempt = require('./quizAttemptModel');
const QuizAnswer = require('./quizAnswerModel');
const { sequelize } = require('../config/db');

// Define relationships
Student.belongsTo(Batch, { foreignKey: 'batch', targetKey: 'id' });
Batch.hasMany(Student, { foreignKey: 'batch', sourceKey: 'id' });

// Semester relationships
Batch.hasMany(Semester, { foreignKey: 'batchId', sourceKey: 'id' });
Semester.belongsTo(Batch, { foreignKey: 'batchId', targetKey: 'id' });

// Student's active semester relationship
Student.belongsTo(Semester, { foreignKey: 'activeSemesterId', as: 'activeSemester' });
Semester.hasMany(Student, { foreignKey: 'activeSemesterId', as: 'activeStudents' });

// Subject's semester relationship
Subject.belongsTo(Semester, { foreignKey: 'semesterId' });
Semester.hasMany(Subject, { foreignKey: 'semesterId' });

// Keep backward compatibility relationship for Subject-Batch
Subject.belongsTo(Batch, { foreignKey: 'batchId', targetKey: 'id' });
Batch.hasMany(Subject, { foreignKey: 'batchId', sourceKey: 'id' });

// Timetable relationships
Semester.hasMany(Timetable, { foreignKey: 'semesterId', sourceKey: 'id' });
Timetable.belongsTo(Semester, { foreignKey: 'semesterId', targetKey: 'id' });

Batch.hasMany(Timetable, { foreignKey: 'batchId', sourceKey: 'id' });
Timetable.belongsTo(Batch, { foreignKey: 'batchId', targetKey: 'id' });

Timetable.hasMany(TimetableSlot, { foreignKey: 'timetableId', as: 'slots', onDelete: 'CASCADE', hooks: true });
TimetableSlot.belongsTo(Timetable, { foreignKey: 'timetableId', as: 'timetable' });

TimetableSlot.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
Subject.hasMany(TimetableSlot, { foreignKey: 'subjectId', as: 'timetableSlots' });

TimetableSlot.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Teacher.hasMany(TimetableSlot, { foreignKey: 'teacherId', as: 'scheduledSlots' });

TimetableSlot.belongsTo(Semester, { foreignKey: 'semesterId', as: 'semester' });
Semester.hasMany(TimetableSlot, { foreignKey: 'semesterId', as: 'scheduledSlots' });

// Teacher-Subject many-to-many relationship
Teacher.belongsToMany(Subject, { 
  through: TeacherSubject, 
  foreignKey: 'teacherId',
  otherKey: 'subjectId'
});
Subject.belongsToMany(Teacher, { 
  through: TeacherSubject, 
  foreignKey: 'subjectId',
  otherKey: 'teacherId'
});

// Also add direct associations for the join table to enable eager loading
TeacherSubject.belongsTo(Teacher, { foreignKey: 'teacherId' });
TeacherSubject.belongsTo(Subject, { foreignKey: 'subjectId' });

// Student submissions
Student.hasMany(Submission, { foreignKey: 'studentId', sourceKey: 'id' });
Submission.belongsTo(Student, { foreignKey: 'studentId', targetKey: 'id' });

Subject.hasMany(Submission, { foreignKey: 'subjectId', sourceKey: 'id' });
Submission.belongsTo(Subject, { foreignKey: 'subjectId', targetKey: 'id' });

Teacher.hasMany(Submission, { foreignKey: 'gradedBy', sourceKey: 'id' });
Submission.belongsTo(Teacher, { foreignKey: 'gradedBy', targetKey: 'id' });

// Assignment relationships
Teacher.hasMany(Assignment, { foreignKey: 'teacherId', sourceKey: 'id' });
Assignment.belongsTo(Teacher, { foreignKey: 'teacherId', targetKey: 'id' });

Subject.hasMany(Assignment, { foreignKey: 'subjectId', sourceKey: 'id' });
Assignment.belongsTo(Subject, { foreignKey: 'subjectId', targetKey: 'id' });

// Link Submission to Assignment (students submit assignments)
Assignment.hasMany(Submission, { foreignKey: 'assignmentId', sourceKey: 'id' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId', targetKey: 'id' });

// Governance: Proposals and Votes
Proposal.belongsTo(Admin, { foreignKey: 'createdByAdminId', targetKey: 'id' });
Admin.hasMany(Proposal, { foreignKey: 'createdByAdminId', sourceKey: 'id' });

Proposal.hasMany(ProposalVote, { foreignKey: 'proposalId', sourceKey: 'id' });
ProposalVote.belongsTo(Proposal, { foreignKey: 'proposalId', targetKey: 'id' });

Teacher.hasMany(ProposalVote, { foreignKey: 'teacherId', sourceKey: 'id' });
ProposalVote.belongsTo(Teacher, { foreignKey: 'teacherId', targetKey: 'id' });

// Certificates
Certificate.belongsTo(Submission, { foreignKey: 'submissionId', targetKey: 'id' });
Submission.hasOne(Certificate, { foreignKey: 'submissionId', sourceKey: 'id' });
Certificate.belongsTo(Student, { foreignKey: 'studentId', targetKey: 'id' });
Student.hasMany(Certificate, { foreignKey: 'studentId', sourceKey: 'id' });

// Quiz relationships
Quiz.belongsTo(Teacher, { foreignKey: 'teacherId', targetKey: 'id' });
Teacher.hasMany(Quiz, { foreignKey: 'teacherId', sourceKey: 'id' });

Quiz.belongsTo(Subject, { foreignKey: 'subjectId', targetKey: 'id' });
Subject.hasMany(Quiz, { foreignKey: 'subjectId', sourceKey: 'id' });

Quiz.belongsTo(Batch, { foreignKey: 'batchId', targetKey: 'id' });
Batch.hasMany(Quiz, { foreignKey: 'batchId', sourceKey: 'id' });

Quiz.hasMany(QuizQuestion, { foreignKey: 'quizId', sourceKey: 'id', onDelete: 'CASCADE' });
QuizQuestion.belongsTo(Quiz, { foreignKey: 'quizId', targetKey: 'id' });

QuizQuestion.hasMany(QuizOption, { foreignKey: 'questionId', sourceKey: 'id', onDelete: 'CASCADE' });
QuizOption.belongsTo(QuizQuestion, { foreignKey: 'questionId', targetKey: 'id' });

Quiz.hasMany(QuizAttempt, { foreignKey: 'quizId', sourceKey: 'id', onDelete: 'CASCADE' });
QuizAttempt.belongsTo(Quiz, { foreignKey: 'quizId', targetKey: 'id' });

QuizAttempt.belongsTo(Student, { foreignKey: 'studentId', targetKey: 'id' });
Student.hasMany(QuizAttempt, { foreignKey: 'studentId', sourceKey: 'id' });

QuizAttempt.hasMany(QuizAnswer, { foreignKey: 'attemptId', sourceKey: 'id', onDelete: 'CASCADE' });
QuizAnswer.belongsTo(QuizAttempt, { foreignKey: 'attemptId', targetKey: 'id' });

QuizAnswer.belongsTo(QuizQuestion, { foreignKey: 'questionId', targetKey: 'id' });
QuizQuestion.hasMany(QuizAnswer, { foreignKey: 'questionId', sourceKey: 'id' });

QuizAnswer.belongsTo(QuizOption, { foreignKey: 'selectedOptionId', targetKey: 'id' });
QuizOption.hasMany(QuizAnswer, { foreignKey: 'selectedOptionId', sourceKey: 'id' });

// Export models
module.exports = {
  Student,
  Teacher,
  Subject,
  Batch,
  Submission,
  Admin,
  TeacherSubject,
  Semester,
  Assignment,
  Proposal,
  ProposalVote,
  Notification,
  PasswordResetToken,
  Certificate,
  RedemptionHistory,
  Timetable,
  TimetableSlot,
  Quiz,
  QuizQuestion,
  QuizOption,
  QuizAttempt,
  QuizAnswer,
  sequelize
}; 