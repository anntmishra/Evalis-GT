const Student = require('./studentModel');
const Teacher = require('./teacherModel');
const Subject = require('./subjectModel');
const Batch = require('./batchModel');
const Submission = require('./submissionModel');
const Admin = require('./adminModel');
const School = require('./schoolModel');
const Specialization = require('./specializationModel');
const StudentSubjectGrade = require('./gradeModel');
const Semester = require('./semesterModel');
const Assignment = require('./assignmentModel');
const Notification = require('./notificationModel');
const PasswordResetToken = require('./passwordResetTokenModel');
const Quiz = require('./quizModel');
const QuizQuestion = require('./quizQuestionModel');
const QuizOption = require('./quizOptionModel');
const QuizAttempt = require('./quizAttemptModel');
const QuizAnswer = require('./quizAnswerModel');
const Department = require('./departmentModel');
const Program = require('./programModel');
const Section = require('./sectionModel');
const SectionGroup = require('./sectionGroupModel');
const { UserRoleAssignment } = require('./rbacModels');
const { StudentSemesterEnrollment, StudentSectionEnrollment } = require('./enrollmentModels');
const PendingInvite = require('./pendingInviteModel');
const GradeRevision = require('./gradeRevisionModel');
const Tenant = require('./tenantModel');
const TeachingAssignment = require('./teachingAssignmentModel');
const QuestionPaper = require('./questionPaperModel');
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

// Teacher-Subject many-to-many relationship
Teacher.belongsToMany(Subject, { 
  through: TeachingAssignment, 
  foreignKey: 'teacherId',
  otherKey: 'subjectId'
});
Subject.belongsToMany(Teacher, { 
  through: TeachingAssignment, 
  foreignKey: 'subjectId',
  otherKey: 'teacherId'
});

// Deprecated TeacherSubject associations removed

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

QuestionPaper.belongsTo(Teacher, { foreignKey: 'teacherId', targetKey: 'id' });
Teacher.hasMany(QuestionPaper, { foreignKey: 'teacherId', sourceKey: 'id' });
QuestionPaper.belongsTo(Subject, { foreignKey: 'subjectId', targetKey: 'id' });
Subject.hasMany(QuestionPaper, { foreignKey: 'subjectId', sourceKey: 'id' });
QuestionPaper.belongsTo(Batch, { foreignKey: 'batchId', targetKey: 'id' });
Batch.hasMany(QuestionPaper, { foreignKey: 'batchId', sourceKey: 'id' });

// --- NEW RBAC & ORGANIZATIONAL HIERARCHY RELATIONSHIPS ---

// Department -> Program (School -> Department -> Program -> Batch is the real academic
// hierarchy; Program.schoolId is kept as a denormalized shortcut for existing UI, see
// programModel.js comments)
Department.hasMany(Program, { foreignKey: 'departmentId', sourceKey: 'id' });
Program.belongsTo(Department, { foreignKey: 'departmentId', targetKey: 'id' });

// Department -> Batch (derived from Batch's Program.departmentId at creation time; see
// batchModel.js comments -- authoritative over the legacy `department` STRING field)
Department.hasMany(Batch, { foreignKey: 'departmentId', sourceKey: 'id' });
Batch.belongsTo(Department, { foreignKey: 'departmentId', targetKey: 'id' });

// Program -> Batch
Program.hasMany(Batch, { foreignKey: 'programId', sourceKey: 'id' });
Batch.belongsTo(Program, { foreignKey: 'programId', targetKey: 'id' });

// Subject -> Section
Subject.hasMany(Section, { foreignKey: 'subjectId', sourceKey: 'id' });
Section.belongsTo(Subject, { foreignKey: 'subjectId', targetKey: 'id' });

// Semester -> Section
Semester.hasMany(Section, { foreignKey: 'semesterId', sourceKey: 'id' });
Section.belongsTo(Semester, { foreignKey: 'semesterId', targetKey: 'id' });

// Teacher -> Section
Teacher.hasMany(Section, { foreignKey: 'teacherId', sourceKey: 'id' });
Section.belongsTo(Teacher, { foreignKey: 'teacherId', targetKey: 'id' });

// Enrollment Relationships
StudentSemesterEnrollment.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(StudentSemesterEnrollment, { foreignKey: 'studentId' });

StudentSemesterEnrollment.belongsTo(Semester, { foreignKey: 'semesterId' });
Semester.hasMany(StudentSemesterEnrollment, { foreignKey: 'semesterId' });

StudentSemesterEnrollment.belongsTo(Batch, { foreignKey: 'batchId' });
Batch.hasMany(StudentSemesterEnrollment, { foreignKey: 'batchId' });

// StudentSectionEnrollment Relationships
StudentSectionEnrollment.belongsTo(Student, { foreignKey: 'studentId' });
Student.hasMany(StudentSectionEnrollment, { foreignKey: 'studentId' });

StudentSectionEnrollment.belongsTo(Section, { foreignKey: 'sectionId' });
Section.hasMany(StudentSectionEnrollment, { foreignKey: 'sectionId' });

StudentSectionEnrollment.belongsTo(Semester, { foreignKey: 'semesterId' });
Semester.hasMany(StudentSectionEnrollment, { foreignKey: 'semesterId' });

// SectionGroup Relationships (lecture-group composition: N sections -> 1 shared lecture)
SectionGroup.hasMany(Section, { foreignKey: 'sectionGroupId' });
Section.belongsTo(SectionGroup, { foreignKey: 'sectionGroupId' });

Batch.hasMany(SectionGroup, { foreignKey: 'batchId' });
SectionGroup.belongsTo(Batch, { foreignKey: 'batchId' });

Semester.hasMany(SectionGroup, { foreignKey: 'semesterId' });
SectionGroup.belongsTo(Semester, { foreignKey: 'semesterId' });

// A student's own lecture-group membership (direct, simple -- for roster display/edit),
// distinct from Section.sectionGroupId above (which scopes a subject-specific teaching
// Section's lectures, for future HOD/TeachingAssignment work).
SectionGroup.hasMany(Student, { foreignKey: 'sectionGroupId' });
Student.belongsTo(SectionGroup, { foreignKey: 'sectionGroupId' });

// Grade Revision Relationships
GradeRevision.belongsTo(Submission, { foreignKey: 'submissionId' });
Submission.hasMany(GradeRevision, { foreignKey: 'submissionId' });

// Tenant relationships -- Tier-1 tables carry tenantId directly (see Phase 1 migration).
// Everything else (Department, Program, Batch, Semester, Subject, Section, TeachingAssignment,
// CourseHandout, ...) inherits tenant scope transitively via FK join to one of these.
const TENANT_SCOPED_MODELS = [School, Student, Teacher, Admin, Submission, Quiz, StudentSubjectGrade, UserRoleAssignment, Notification, PendingInvite];
TENANT_SCOPED_MODELS.forEach(model => {
  Tenant.hasMany(model, { foreignKey: 'tenantId' });
  model.belongsTo(Tenant, { foreignKey: 'tenantId' });
});

TeachingAssignment.belongsTo(Teacher, { foreignKey: 'teacherId' });
Teacher.hasMany(TeachingAssignment, { foreignKey: 'teacherId' });

// UserRoleAssignment Relationships
Department.hasMany(UserRoleAssignment, { foreignKey: 'departmentId', as: 'HODs' });
UserRoleAssignment.belongsTo(Department, { foreignKey: 'departmentId' });

Batch.hasMany(UserRoleAssignment, { foreignKey: 'batchId', as: 'Coordinators' });
UserRoleAssignment.belongsTo(Batch, { foreignKey: 'batchId' });

UserRoleAssignment.belongsTo(Teacher, { as: 'AssignedTeacher', foreignKey: 'teacherId', targetKey: 'id' });
Teacher.hasMany(UserRoleAssignment, { foreignKey: 'teacherId', sourceKey: 'id' });

UserRoleAssignment.belongsTo(Subject, { foreignKey: 'subjectId', targetKey: 'id' });
Subject.hasMany(UserRoleAssignment, { as: 'HodAssignments', foreignKey: 'subjectId', sourceKey: 'id' });

UserRoleAssignment.belongsTo(Semester, { foreignKey: 'semesterId', targetKey: 'id' });
Semester.hasMany(UserRoleAssignment, { foreignKey: 'semesterId', sourceKey: 'id' });

TeachingAssignment.belongsTo(Subject, { foreignKey: 'subjectId' });
Subject.hasMany(TeachingAssignment, { foreignKey: 'subjectId' });

TeachingAssignment.belongsTo(Section, { foreignKey: 'sectionId' });
Section.hasMany(TeachingAssignment, { foreignKey: 'sectionId' });

TeachingAssignment.belongsTo(Batch, { foreignKey: 'batchId' });
Batch.hasMany(TeachingAssignment, { foreignKey: 'batchId' });

TeachingAssignment.belongsTo(Semester, { foreignKey: 'semesterId' });
Semester.hasMany(TeachingAssignment, { foreignKey: 'semesterId' });


// Export models
// New Curriculum Associations
School.hasMany(Department, { foreignKey: 'schoolId' });
Department.belongsTo(School, { foreignKey: 'schoolId' });

School.hasMany(Program, { foreignKey: 'schoolId' });
Program.belongsTo(School, { foreignKey: 'schoolId' });

Department.hasMany(Specialization, { foreignKey: 'departmentId' });
Specialization.belongsTo(Department, { foreignKey: 'departmentId' });

Specialization.hasMany(Student, { foreignKey: 'specializationId' });
Student.belongsTo(Specialization, { foreignKey: 'specializationId' });

Specialization.hasMany(Subject, { foreignKey: 'specializationId' });
Subject.belongsTo(Specialization, { foreignKey: 'specializationId' });

Student.hasMany(StudentSubjectGrade, { foreignKey: 'studentId' });
StudentSubjectGrade.belongsTo(Student, { foreignKey: 'studentId' });

Subject.hasMany(StudentSubjectGrade, { foreignKey: 'subjectId' });
StudentSubjectGrade.belongsTo(Subject, { foreignKey: 'subjectId' });

Semester.hasMany(StudentSubjectGrade, { foreignKey: 'semesterId' });
StudentSubjectGrade.belongsTo(Semester, { foreignKey: 'semesterId' });

// Add schoolId to UserRoleAssignment (if scoped to Dean)
School.hasMany(UserRoleAssignment, { foreignKey: 'schoolId', as: 'Deans' });
UserRoleAssignment.belongsTo(School, { foreignKey: 'schoolId' });

const RoleRequest = require('./roleRequestModel');
const CourseHandout = require('./courseHandoutModel');
const HandoutVote = require('./handoutVoteModel');

// RoleRequest associations
Tenant.hasMany(RoleRequest, { foreignKey: 'tenantId' });
RoleRequest.belongsTo(Tenant, { foreignKey: 'tenantId' });

RoleRequest.belongsTo(Teacher, { as: 'Proposer', foreignKey: 'proposerId' });
RoleRequest.belongsTo(Teacher, { as: 'TargetUser', foreignKey: 'targetUserId' });
RoleRequest.belongsTo(Teacher, { as: 'AssistantDean', foreignKey: 'assistantDeanId' });
RoleRequest.belongsTo(Teacher, { as: 'Dean', foreignKey: 'deanId' });
RoleRequest.belongsTo(Department, { foreignKey: 'departmentId' });

// CourseHandout associations
CourseHandout.belongsTo(Subject, { foreignKey: 'subjectId' });
Subject.hasMany(CourseHandout, { foreignKey: 'subjectId' });

CourseHandout.belongsTo(Teacher, { as: 'Proposer', foreignKey: 'proposerId' });
Teacher.hasMany(CourseHandout, { foreignKey: 'proposerId' });

CourseHandout.hasMany(HandoutVote, { foreignKey: 'handoutId' });
HandoutVote.belongsTo(CourseHandout, { foreignKey: 'handoutId' });

HandoutVote.belongsTo(Teacher, { as: 'Voter', foreignKey: 'voterId' });
Teacher.hasMany(HandoutVote, { foreignKey: 'voterId' });

module.exports = {
  Student, Teacher, Subject, Program, Batch, 
  Section, SectionGroup, Submission, Admin, Department, School, Specialization, StudentSubjectGrade,
  Semester, Assignment, Notification,
  PasswordResetToken, PendingInvite, Tenant,
  TeachingAssignment, GradeRevision,
  Quiz, QuizQuestion, QuizOption, QuizAttempt, QuizAnswer,
  StudentSemesterEnrollment, StudentSectionEnrollment,
  UserRoleAssignment,
  RoleRequest, CourseHandout, HandoutVote, QuestionPaper,
  sequelize
};
