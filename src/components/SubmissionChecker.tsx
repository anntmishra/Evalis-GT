import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Chip,
  Paper,
  Grid
} from '@mui/material';
import { 
  Warning, 
  CheckCircle,
  Description
} from '@mui/icons-material';
import { STUDENT_SUBMISSIONS } from '../constants/universityData';

interface SubmissionCheckerProps {
  studentIds: string[];
  examType: string;
  subjectId: string;
}

interface Submission {
  studentId: string;
  studentName: string;
  submissionText: string;
  submissionDate: string;
  plagiarismScore: number;
}

const SubmissionChecker: React.FC<SubmissionCheckerProps> = ({ 
  studentIds, 
  examType, 
  subjectId 
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    // Get submissions for the selected students, exam type, and subject
    const filteredSubmissions: Submission[] = [];
    
    studentIds.forEach(studentId => {
      const studentSubmissions = STUDENT_SUBMISSIONS[studentId] || [];
      const submission = studentSubmissions.find(
        sub => sub.examType === examType && sub.subjectId === subjectId
      );
      
      if (submission) {
        filteredSubmissions.push({
          studentId,
          studentName: studentId, // Usually you'd fetch the name from a students list
          submissionText: submission.submissionText,
          submissionDate: submission.submissionDate,
          plagiarismScore: submission.plagiarismScore || 0
        });
      }
    });
    
    setSubmissions(filteredSubmissions);
  }, [studentIds, examType, subjectId]);

  const getPlagiarismColor = (score: number) => {
    if (score === 0) return 'success';
    if (score < 15) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Submission Checker
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {subjectId} - {examType} - {submissions.length} submissions
      </Typography>
      
      <Grid container spacing={3}>
        {submissions.map(submission => (
          <Grid item xs={12} md={6} key={submission.studentId}>
            <Paper elevation={2}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center', 
                    mb: 2 
                  }}>
                    <Box>
                      <Typography variant="h6">
                        {submission.studentId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Submitted: {new Date(submission.submissionDate).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Chip
                      icon={submission.plagiarismScore > 0 ? <Warning /> : <CheckCircle />}
                      label={`${submission.plagiarismScore}% similar`}
                      color={getPlagiarismColor(submission.plagiarismScore)}
                      size="small"
                    />
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {submission.submissionText}
                  </Typography>
                </CardContent>
              </Card>
            </Paper>
          </Grid>
        ))}
        
        {submissions.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              flexDirection: 'column',
              p: 4
            }}>
              <Description sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No submissions found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                There are no submissions for this subject and exam type.
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SubmissionChecker;