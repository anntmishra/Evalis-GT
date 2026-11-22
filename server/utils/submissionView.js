// Withhold grading details until the examination office publishes the result.
function submissionView(row, role) {
  const value = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  if (role === 'student' && value.gradingState !== 'published') {
    for (const field of ['score', 'letterGrade', 'gradePoints', 'plagiarismScore', 'gradedBy', 'gradedDate', 'gradedFileUrl', 'annotations']) value[field] = null;
    value.feedback = '';
    value.graded = false;
  }
  return value;
}
module.exports = { submissionView };
