const Student = require('./studentModel');
const Teacher = require('./teacherModel');
const Subject = require('./subjectModel');
const Batch = require('./batchModel');
const Submission = require('./submissionModel');
const Admin = require('./adminModel');
const TeacherSubject = require('./teacherSubjectModel');
const { sequelize } = require('../config/db');

// Define relationships
Student.belongsTo(Batch, { foreignKey: 'batch', targetKey: 'id' });
Batch.hasMany(Student, { foreignKey: 'batch', sourceKey: 'id' });

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

// Student submissions
Student.hasMany(Submission, { foreignKey: 'studentId', sourceKey: 'id' });
Submission.belongsTo(Student, { foreignKey: 'studentId', targetKey: 'id' });

Subject.hasMany(Submission, { foreignKey: 'subjectId', sourceKey: 'id' });
Submission.belongsTo(Subject, { foreignKey: 'subjectId', targetKey: 'id' });

Teacher.hasMany(Submission, { foreignKey: 'gradedBy', sourceKey: 'id' });
Submission.belongsTo(Teacher, { foreignKey: 'gradedBy', targetKey: 'id' });

// Export models
module.exports = {
  Student,
  Teacher,
  Subject,
  Batch,
  Submission,
  Admin,
  TeacherSubject,
  sequelize
}; 