import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tab,
  Tabs,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  Chip,
  AlertColor,
  SelectChangeEvent,
  MenuItem
} from '@mui/material';
import {
  Assessment,
  Warning,
  CheckCircle,
  CompareArrows,
  CloudUpload
} from '@mui/icons-material';
import { Subject, ExamType } from '../types/university';
import { STUDENTS, STUDENT_SUBMISSIONS, GRADE_SCALE, SUBJECTS, EXAM_TYPES } from '../constants/universityData';
import GradeDistribution from '../components/GradeDistribution';
import SubmissionChecker from '../components/SubmissionChecker';
import SubmissionUploader, { SubmissionData } from '../components/SubmissionUploader';
import Header from '../components/Header';
import { uploadTeacherSubmission } from '../api';

interface AlertState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface SubmissionDisplay {
  studentId: string;
  studentName: string;
  examType: string;
  submissionDate: string;
  score: number | null;
  graded: boolean;
}

const TeacherPortal: React.FC = () => {
  const [selectedBatch, setSelectedBatch] = useState<keyof typeof STUDENTS>('2023-2027');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<string>('');
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [plagiarismResults, setPlagiarismResults] = useState<Record<string, number>>({});
  const [alert, setAlert] = useState<AlertState>({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    // Get all submissions for the selected batch
    const students = STUDENTS[selectedBatch] || [];
    const allSubmissions: SubmissionDisplay[] = [];

    students.forEach((student) => {
      const studentSubmissions = STUDENT_SUBMISSIONS[student.id] || [];
      studentSubmissions.forEach((submission) => {
        if (submission.score !== undefined && submission.plagiarismScore !== undefined) {
          allSubmissions.push({
            studentId: student.id,
            studentName: student.name,
            examType: submission.examType,
            submissionDate: submission.submissionDate,
            score: submission.score,
            graded: true,
          });
        }
      });
    });
  }, [selectedBatch]);

  const handleGradeChange = (studentId: string, value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setGrades(prev => ({ ...prev, [studentId]: numValue }));
    }
  };

  const checkPlagiarism = () => {
    // Simulate plagiarism detection
    const results: Record<string, number> = {};
    const students = STUDENTS[selectedBatch] || [];
    students.forEach((student) => {
      results[student.id] = Math.floor(Math.random() * 30); // Random similarity percentage
    });
    setPlagiarismResults(results);
    setAlert({
      open: true,
      message: 'Plagiarism check completed',
      severity: 'info',
    });
  };

  const calculateGrade = (score: number): string => {
    for (const [grade, range] of Object.entries(GRADE_SCALE)) {
      if (score >= range.min && score <= range.max) {
        return grade;
      }
    }
    return 'F';
  };

  const saveGrades = () => {
    // Here you would typically save to a backend
    setAlert({
      open: true,
      message: 'Grades saved successfully',
      severity: 'success',
    });
  };

  const handleBatchChange = (event: SelectChangeEvent<string>) => {
    setSelectedBatch(event.target.value as keyof typeof STUDENTS);
    setSelectedSubject('');
    setGrades({});
    setPlagiarismResults({});
  };

  const handleSubjectChange = (event: SelectChangeEvent<string>) => {
    setSelectedSubject(event.target.value);
  };

  const handleExamTypeChange = (event: SelectChangeEvent<string>) => {
    setSelectedExamType(event.target.value);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Get students for the selected batch
  const students = STUDENTS[selectedBatch] || [];
  const studentIds = students.map(student => student.id);

  // Get available subjects
  const availableSubjects: Subject[] = [...SUBJECTS['CSE-1'], ...SUBJECTS['CSE-2']];

  const handleUploadSubmission = async (data: SubmissionData) => {
    try {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('subjectId', data.subjectId);
      formData.append('examTypeId', data.examTypeId);
      formData.append('title', data.title);
      formData.append('description', data.description);
      if (data.dueDate) {
        formData.append('dueDate', data.dueDate);
      }

      // Send the data to the backend
      await uploadTeacherSubmission(formData);
      
      setAlert({
        open: true,
        message: 'Assignment uploaded successfully',
        severity: 'success',
      });
      
      return true;
    } catch (error) {
      console.error('Error uploading assignment:', error);
      setAlert({
        open: true,
        message: 'Failed to upload assignment. Please try again.',
        severity: 'error',
      });
      throw error;
    }
  };

  return (
    <Box>
      <Header title="Teacher Portal" />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Batch</InputLabel>
              <Select
                value={selectedBatch}
                label="Batch"
                onChange={handleBatchChange}
              >
                {Object.keys(STUDENTS).map(batch => (
                  <MenuItem key={batch} value={batch}>{batch}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Subject</InputLabel>
              <Select
                value={selectedSubject}
                label="Subject"
                onChange={handleSubjectChange}
                disabled={!selectedBatch}
              >
                {availableSubjects.map((subject: Subject) => (
                  <MenuItem key={subject.id} value={subject.id}>
                    {subject.id} - {subject.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Exam Type</InputLabel>
              <Select
                value={selectedExamType}
                label="Exam Type"
                onChange={handleExamTypeChange}
                disabled={!selectedSubject}
              >
                {EXAM_TYPES.map((examType: ExamType) => (
                  <MenuItem key={examType.id} value={examType.id}>
                    {examType.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {selectedBatch && selectedSubject && selectedExamType && (
          <Paper elevation={3} sx={{ mb: 4 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab 
                icon={<Assessment />} 
                label="Grade Input" 
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<CompareArrows />} 
                label="Submission Check" 
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<CloudUpload />} 
                label="Upload Assignment" 
                sx={{ textTransform: 'none' }}
              />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={4}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                          <Typography variant="h5">Grade Submissions</Typography>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<Assessment />}
                            onClick={checkPlagiarism}
                          >
                            Check Plagiarism
                          </Button>
                        </Box>

                        <TableContainer component={Paper} variant="outlined">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>Student ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Score</TableCell>
                                <TableCell>Grade</TableCell>
                                <TableCell>Plagiarism</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {students.map((student) => (
                                <TableRow key={student.id}>
                                  <TableCell>{student.id}</TableCell>
                                  <TableCell>{student.name}</TableCell>
                                  <TableCell>
                                    <TextField
                                      type="number"
                                      size="small"
                                      value={grades[student.id] || ''}
                                      onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                      inputProps={{ min: 0, max: 100 }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {grades[student.id] ? calculateGrade(grades[student.id]) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {plagiarismResults[student.id] !== undefined && (
                                      <Chip
                                        icon={plagiarismResults[student.id] > 20 ? <Warning /> : <CheckCircle />}
                                        label={`${plagiarismResults[student.id]}% similar`}
                                        color={plagiarismResults[student.id] > 20 ? 'error' : 'success'}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={saveGrades}
                          >
                            Save Grades
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h5" gutterBottom>
                          Grade Analysis
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <GradeDistribution grades={grades} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mt: 2 }}>
                <SubmissionChecker
                  studentIds={studentIds}
                  examType={selectedExamType}
                  subjectId={selectedSubject}
                />
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mt: 2 }}>
                <SubmissionUploader
                  subjects={availableSubjects}
                  examTypes={EXAM_TYPES}
                  onUploadSubmission={handleUploadSubmission}
                />
              </Box>
            </TabPanel>
          </Paper>
        )}

        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={() => setAlert({ ...alert, open: false })}
        >
          <Alert 
            severity={alert.severity} 
            onClose={() => setAlert({ ...alert, open: false })}
            sx={{ width: '100%' }}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default TeacherPortal;