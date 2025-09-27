const asyncHandler = require('express-async-handler');
const { Student, Submission, Assignment, Subject } = require('../models');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get comprehensive student data for AI analysis
// @route   GET /api/ai-analyzer/comprehensive-data/:studentId
// @access  Private (Student can only access their own data)
const getComprehensiveStudentData = asyncHandler(async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Check if user can access this student's data (student accessing their own, or teacher/admin)
    if (req.user.role === 'student' && req.user.id !== studentId) {
      res.status(403);
      throw new Error('Access denied');
    }

    // Get student profile
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: Subject,
          as: 'subjects',
          attributes: ['id', 'name', 'credits']
        }
      ]
    });

    if (!student) {
      res.status(404);
      throw new Error('Student not found');
    }

    // Get all submissions for this student with assignment and subject details
    const submissions = await Submission.findAll({
      where: { studentId },
      include: [
        {
          model: Assignment,
          attributes: ['id', 'title', 'subjectId', 'totalMarks', 'dueDate'],
          include: [
            {
              model: Subject,
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['submissionDate', 'DESC']]
    });

    // Calculate comprehensive analytics
    const analytics = calculateStudentAnalytics(submissions, student.subjects || []);

    // Construct comprehensive data object
    const comprehensiveData = {
      id: student.id,
      name: student.name,
      rollNumber: student.id,
      email: student.email,
      batch: student.batch,
      semester: student.semester,
      grades: analytics.grades,
      submissions: analytics.submissions,
      performanceTrend: analytics.performanceTrend,
      subjectDetails: analytics.subjectDetails,
      recommendations: generateRecommendations(analytics),
      lastUpdated: new Date().toISOString()
    };

    res.json(comprehensiveData);
  } catch (error) {
    console.error('Error fetching comprehensive student data:', error);
    res.status(500);
    throw new Error('Failed to fetch student data');
  }
});

// Helper function to calculate analytics from submissions and subjects
function calculateStudentAnalytics(submissions, subjects) {
  const analytics = {
    grades: {
      overall: 0,
      bySubject: {},
      distribution: { excellent: 0, good: 0, average: 0, poor: 0 }
    },
    submissions: {
      total: submissions.length,
      onTime: 0,
      late: 0,
      graded: 0,
      pending: 0,
      bySubject: {}
    },
    performanceTrend: 'stable',
    subjectDetails: {}
  };

  // Initialize subject data
  subjects.forEach(subject => {
    analytics.grades.bySubject[subject.id] = 0;
    analytics.submissions.bySubject[subject.id] = {
      total: 0,
      onTime: 0,
      late: 0,
      graded: 0,
      averageScore: 0
    };
    analytics.subjectDetails[subject.id] = {
      name: subject.name,
      credits: subject.credits,
      totalAssignments: 0,
      completedAssignments: 0,
      averageGrade: 0,
      status: 'active'
    };
  });

  // Process submissions
  let totalScore = 0;
  let gradedCount = 0;
  const scoresBySubject = {};
  const recentScores = [];
  const olderScores = [];

  // Sort submissions by date for trend analysis
  const sortedSubmissions = [...submissions].sort((a, b) => 
    new Date(b.submissionDate) - new Date(a.submissionDate)
  );

  submissions.forEach((submission, index) => {
    const subjectId = submission.Assignment?.subjectId;
    if (!subjectId) return;

    // Initialize subject scores array if not exists
    if (!scoresBySubject[subjectId]) {
      scoresBySubject[subjectId] = [];
    }

    // Count submission statistics
    analytics.submissions.bySubject[subjectId].total++;
    analytics.subjectDetails[subjectId].totalAssignments++;

    // Check if late (simplified - you may want to implement proper due date checking)
    const isLate = submission.isLate || (submission.Assignment?.dueDate && 
      new Date(submission.submissionDate) > new Date(submission.Assignment.dueDate));

    if (isLate) {
      analytics.submissions.late++;
      analytics.submissions.bySubject[subjectId].late++;
    } else {
      analytics.submissions.onTime++;
      analytics.submissions.bySubject[subjectId].onTime++;
    }

    // Process graded submissions
    if (submission.score !== null && submission.score !== undefined) {
      analytics.submissions.graded++;
      analytics.submissions.bySubject[subjectId].graded++;
      analytics.subjectDetails[subjectId].completedAssignments++;

      const score = parseFloat(submission.score);
      totalScore += score;
      gradedCount++;
      scoresBySubject[subjectId].push(score);

      // Categorize for trend analysis (recent vs older)
      if (index < sortedSubmissions.length / 2) {
        recentScores.push(score);
      } else {
        olderScores.push(score);
      }

      // Grade distribution
      if (score >= 90) analytics.grades.distribution.excellent++;
      else if (score >= 80) analytics.grades.distribution.good++;
      else if (score >= 70) analytics.grades.distribution.average++;
      else analytics.grades.distribution.poor++;
    } else {
      analytics.submissions.pending++;
    }
  });

  // Calculate overall grade
  if (gradedCount > 0) {
    analytics.grades.overall = Math.round(totalScore / gradedCount);
  }

  // Calculate subject averages
  Object.entries(scoresBySubject).forEach(([subjectId, scores]) => {
    if (scores.length > 0) {
      const average = scores.reduce((a, b) => a + b, 0) / scores.length;
      analytics.grades.bySubject[subjectId] = Math.round(average);
      analytics.submissions.bySubject[subjectId].averageScore = Math.round(average);
      analytics.subjectDetails[subjectId].averageGrade = Math.round(average);
    }
  });

  // Determine performance trend
  if (recentScores.length > 0 && olderScores.length > 0) {
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

    if (recentAvg > olderAvg + 5) {
      analytics.performanceTrend = 'improving';
    } else if (recentAvg < olderAvg - 5) {
      analytics.performanceTrend = 'declining';
    } else {
      analytics.performanceTrend = 'stable';
    }
  }

  return analytics;
}

// Generate AI-ready recommendations based on analytics
function generateRecommendations(analytics) {
  const recommendations = [];

  // Overall performance recommendations
  if (analytics.grades.overall < 70) {
    recommendations.push({
      type: 'urgent',
      category: 'overall_performance',
      message: 'Your overall grade is below 70%. Consider seeking additional help and focusing more study time.',
      priority: 'high'
    });
  } else if (analytics.grades.overall >= 85) {
    recommendations.push({
      type: 'positive',
      category: 'overall_performance', 
      message: 'Excellent overall performance! Keep up the great work.',
      priority: 'low'
    });
  }

  // Subject-specific recommendations
  Object.entries(analytics.grades.bySubject).forEach(([subjectId, grade]) => {
    const subjectName = analytics.subjectDetails[subjectId]?.name || subjectId;
    if (grade < 70) {
      recommendations.push({
        type: 'improvement',
        category: 'subject_performance',
        message: `Focus more attention on ${subjectName} (current: ${grade}%). Consider additional study sessions.`,
        priority: 'high',
        subjectId
      });
    }
  });

  // Submission pattern recommendations
  const totalSubmissions = analytics.submissions.total;
  const latePercentage = totalSubmissions > 0 ? (analytics.submissions.late / totalSubmissions) * 100 : 0;

  if (latePercentage > 30) {
    recommendations.push({
      type: 'behavioral',
      category: 'time_management',
      message: `${latePercentage.toFixed(1)}% of your submissions are late. Work on time management and planning.`,
      priority: 'medium'
    });
  }

  // Performance trend recommendations
  if (analytics.performanceTrend === 'declining') {
    recommendations.push({
      type: 'warning',
      category: 'performance_trend',
      message: 'Your recent performance shows a declining trend. Consider reviewing your study methods.',
      priority: 'high'
    });
  } else if (analytics.performanceTrend === 'improving') {
    recommendations.push({
      type: 'positive',
      category: 'performance_trend',
      message: 'Great job! Your performance is improving. Keep following your current study approach.',
      priority: 'low'
    });
  }

  return recommendations;
}

module.exports = {
  getComprehensiveStudentData
};
