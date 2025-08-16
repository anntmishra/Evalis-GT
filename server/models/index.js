const Student = require('./studentModel');
const Teacher = require('./teacherModel');
const Subject = require('./subjectModel');
const Batch = require('./batchModel');
const Submission = require('./submissionModel');
const Admin = require('./adminModel');
const TeacherSubject = require('./teacherSubjectModel');
const Semester = require('./semesterModel');
const Assignment = require('./assignmentModel');
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
  sequelize
}; 