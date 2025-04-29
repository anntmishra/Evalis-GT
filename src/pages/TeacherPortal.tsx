import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tab,
  Tabs,
  Paper,
  Grid,
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
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Assessment,
  Warning,
  CheckCircle,
  CloudUpload,
  Refresh,
  People
} from '@mui/icons-material';
import { Subject } from '../types/university';
import { EXAM_TYPES } from '../constants/universityData';
import Header from '../components/Header';
import { getStudentsByTeacher, getTeacherSubjects, attemptSessionRecovery } from '../api/teacherService';
import { getStudentsByBatch } from '../api/studentService';
import { getAllBatches } from '../api/batchService';
import { gradeSubmission } from '../api';
import config from '../config/environment';
import { useNavigate } from 'react-router-dom';
import TeacherAssignmentCreator from '../components/TeacherAssignmentCreator';

// Simplified Student type that matches the backend response
interface Student {
  id: string;
  name: string;
  section: string;
  batch: string;
  batchName: string;
}

interface Batch {
  id: string;
  name: string;
  department?: string;
  startYear?: number;
  endYear?: number;
}

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

// Add these interfaces near the top with other interfaces
interface Submission {
  id: string;
  studentId: string;
  subjectId: string;
  examType: string;
  submissionText: string;
  submissionDate: string;
  score: number | null;
  feedback: string | null;
  graded: boolean;
  gradedBy?: string;
  gradedDate?: string;
}

const TeacherPortal: React.FC = () => {
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<string>('');
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [alert, setAlert] = useState<AlertState>({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchAttempted, setFetchAttempted] = useState<boolean>(false);
  const [teacherSubjects, setTeacherSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState<boolean>(false);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState<boolean>(false);
  const [sessionRecoveryAttempted, setSessionRecoveryAttempted] = useState<boolean>(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState<boolean>(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({
    key: 'examType',
    direction: 'asc'
  });
  const navigate = useNavigate();

  // Get teacher info from localStorage using the correct key
  const userData = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
  const teacherInfo = userData ? JSON.parse(userData) : null;
  const teacherId = teacherInfo?.id;

  // Check authentication persistence
  useEffect(() => {
    // Verify the user is logged in and is a teacher
    if (!teacherInfo) {
      console.log('No teacher info found, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (teacherInfo.role !== 'teacher') {
      console.log('User is not a teacher, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Session recovery handler
    const handleSessionRecovery = async () => {
      // Only try recovery once
      if (sessionRecoveryAttempted) return;
      
      setSessionRecoveryAttempted(true);
      console.log('Checking if session recovery is needed...');
      
      // Set flag that we're in recovery mode
      sessionStorage.setItem('auth:recovering', 'true');
      
      try {
        const recoverySuccessful = await attemptSessionRecovery();
        
        if (recoverySuccessful) {
          console.log('Session recovery successful');
          setAlert({
            open: true,
            message: 'Your session has been restored.',
            severity: 'success'
          });
          
          // Now try to fetch students again
          fetchStudents();
        } else {
          console.log('Could not recover session silently, but continuing with local data');
          setAlert({
            open: true,
            message: 'Your session may have expired. Please select a batch to continue.',
            severity: 'warning'
          });
        }
      } catch (error) {
        console.error('Error during session recovery:', error);
      } finally {
        // Clear recovery flag
        sessionStorage.removeItem('auth:recovering');
      }
    };
    
    // Check token status and attempt recovery if needed
    const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
    if (!token && teacherInfo) {
      console.log('No auth token found, but user info exists - attempting recovery');
      handleSessionRecovery();
    }
    
    // Setup auth event listeners
    const handleAuthError = (event: CustomEvent<{message: string}>) => {
      console.log('Auth error event received:', event.detail.message);
      setAlert({
        open: true,
        message: event.detail.message,
        severity: 'error'
      });
      
      // Clear user data and redirect to login after a short delay
      setTimeout(() => {
        localStorage.removeItem(config.AUTH.CURRENT_USER_KEY);
        localStorage.removeItem(config.AUTH.TOKEN_STORAGE_KEY);
        navigate('/login');
      }, 2000);
    };
    
    const handleAuthWarning = (event: CustomEvent<{message: string}>) => {
      console.log('Auth warning event received:', event.detail.message);
      setAlert({
        open: true,
        message: event.detail.message,
        severity: 'warning'
      });
      
      // Try session recovery
      handleSessionRecovery();
    };
    
    window.addEventListener('auth:error', handleAuthError as EventListener);
    window.addEventListener('auth:warning', handleAuthWarning as EventListener);
    
    // Fetch students taught by this teacher, but only if we haven't attempted yet
    if (teacherId && !fetchAttempted) {
      fetchStudents();
    }
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('auth:error', handleAuthError as EventListener);
      window.removeEventListener('auth:warning', handleAuthWarning as EventListener);
    };
  }, [teacherId, navigate, teacherInfo, fetchAttempted, sessionRecoveryAttempted]);

  // Fetch teacher subjects
  useEffect(() => {
    const fetchTeacherSubjects = async () => {
      if (!teacherId) {
        console.warn('No teacher ID available for fetching subjects');
        return;
      }
      
      try {
        setSubjectsLoading(true);
        console.log('Fetching subjects for teacher:', teacherId);
        const fetchedSubjects = await getTeacherSubjects();
        console.log('Fetched teacher subjects:', fetchedSubjects);
        setTeacherSubjects(fetchedSubjects);
        
        // If we have subjects and none is selected yet, select the first one
        if (fetchedSubjects?.length > 0 && !selectedSubject) {
          console.log('Setting initial subject to:', fetchedSubjects[0].id);
          setSelectedSubject(fetchedSubjects[0].id);
        }
        
        setSubjectsLoading(false);
      } catch (error) {
        console.error('Error fetching teacher subjects:', error);
        setAlert({
          open: true,
          message: 'Failed to load subjects. Please try again later.',
          severity: 'error'
        });
        setSubjectsLoading(false);
      }
    };
    
    fetchTeacherSubjects();
  }, [teacherId, selectedSubject]);

  // Fetch all available batches
  useEffect(() => {
    const fetchAvailableBatches = async () => {
      try {
        setBatchesLoading(true);
        const batches = await getAllBatches();
        console.log('Fetched available batches:', batches);
        setAvailableBatches(batches);
        setBatchesLoading(false);
      } catch (error) {
        console.error('Error fetching batches:', error);
        setBatchesLoading(false);
      }
    };
    
    fetchAvailableBatches();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setFetchAttempted(true); // Mark that we've attempted a fetch
      
      // Explicitly log authentication status
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || 
                   (teacherInfo?.token ? teacherInfo.token : null);
      
      console.log('Fetching students with auth token available:', !!token);
      console.log('Teacher ID:', teacherId);
      
      if (!teacherId) {
        console.error('No teacher ID available');
        setAlert({
          open: true,
          message: 'Teacher ID is missing. Please log in again.',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      try {
        const fetchedStudents = await getStudentsByTeacher(teacherId);
        console.log('Fetched students:', fetchedStudents);
        setStudentsList(fetchedStudents);
        
        // Group students by batch for filtering
        const batchesSet = new Set(fetchedStudents
          .filter((student: Student) => student.batch) // Only include students with batch
          .map((student: Student) => student.batch));
        
        const availableBatchNames = [...batchesSet];
        console.log('Available batch names:', availableBatchNames);
        
        // If we have students and no batch is selected yet, select the first batch
        if (fetchedStudents.length > 0 && !selectedBatch && batchesSet.size > 0) {
          const firstBatch = Array.from(batchesSet)[0] as string;
          console.log('Setting initial batch to:', firstBatch);
          setSelectedBatch(firstBatch);
        }
      } catch (apiError: any) {
        // Handle authentication errors specially to avoid redirecting
        // on page reload when the token exists but might be expired
        if (apiError.response && (apiError.response.status === 401 || apiError.response.status === 403)) {
          console.log('Authentication error during API call, but not redirecting immediately');
          setAlert({
            open: true,
            message: 'Session may have expired. Try selecting a batch to continue.',
            severity: 'warning'
          });
        } else {
          throw apiError; // re-throw for the outer catch to handle
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setAlert({
        open: true,
        message: 'Failed to load students. Please try again later.',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Update the batch fetch function with better error handling  
  const fetchStudentsByBatch = async (batchId: string) => {
    if (!batchId) {
      setAlert({
        open: true,
        message: 'Please select a batch first',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setLoading(true);
      console.log(`Manually fetching students for batch: ${batchId}`);
      
      try {
        const fetchedStudents = await getStudentsByBatch(batchId);
        console.log('Fetched students by batch:', fetchedStudents);
        
        // Process students to ensure they have batch information
        const processedStudents = fetchedStudents.map((student: any) => {
          // Ensure the student has batch information
          if (!student.batchName && student.batch) {
            // Find batch name from available batches
            const batch = availableBatches.find(b => b.id === student.batch);
            return {
              ...student,
              batchName: batch?.name || `Batch ${student.batch}`
            };
          }
          return student;
        });
        
        setStudentsList(processedStudents);
        
        setAlert({
          open: true,
          message: `Successfully loaded ${processedStudents.length} students from batch ${batchId}`,
          severity: 'success'
        });
      } catch (apiError: any) {
        // If we get auth error when manually fetching, try to recover
        if (apiError.response && (apiError.response.status === 401 || apiError.response.status === 403)) {
          console.log('Authentication error during API call - treating as session recovery');
          setAlert({
            open: true,
            message: 'Session expired during fetch. Please click "Load Students" again.',
            severity: 'warning'
          });
        } else {
          throw apiError; // re-throw for the outer catch to handle
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students by batch:', error);
      setAlert({
        open: true,
        message: 'Failed to load students for this batch. Please try again.',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  // Add a manual refresh function for all data
  const handleRefreshAll = () => {
    console.log('Refreshing all teacher data...');
    fetchStudents();
    
    // Also refresh subjects
    const fetchTeacherSubjects = async () => {
      try {
        setSubjectsLoading(true);
        const fetchedSubjects = await getTeacherSubjects();
        console.log('Refreshed teacher subjects:', fetchedSubjects);
        setTeacherSubjects(fetchedSubjects);
        setSubjectsLoading(false);
      } catch (error) {
        console.error('Error refreshing teacher subjects:', error);
        setSubjectsLoading(false);
      }
    };
    
    fetchTeacherSubjects();
  };

  // Add a manual refresh function for students
  const handleRefresh = () => {
    console.log('Refreshing student data...');
    fetchStudents();
  };

  const handleGradeChange = (studentId: string, value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setGrades(prev => ({ ...prev, [studentId]: numValue }));
    }
  };

  const handleBatchChange = (event: SelectChangeEvent<string>) => {
    const newBatchId = event.target.value;
    setSelectedBatch(newBatchId);
    
    // Reset other selections
    setGrades({});
    
    // Automatically fetch students for the selected batch
    if (newBatchId) {
      fetchStudentsByBatch(newBatchId);
    }
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

  // Filter students by selected batch
  const filteredStudents = selectedBatch 
    ? studentsList.filter(student => student.batch === selectedBatch)
    : studentsList;

  // Group batches with their names for display
  const batchesWithNames = studentsList.reduce((acc, student) => {
    if (student.batch && !acc[student.batch]) {
      acc[student.batch] = {
        id: student.batch,
        name: student.batchName || `Batch ${student.batch}`
      };
    }
    return acc;
  }, {} as Record<string, { id: string, name: string }>);

  // Ensure we have at least one batch option
  const availableBatchesForDropdown = Object.values(batchesWithNames).length > 0 
    ? Object.values(batchesWithNames)
    : [{ id: 'default', name: 'Default Batch' }];
    
  console.log('Batches for dropdown:', availableBatchesForDropdown);

  // Add this function to fetch submissions
  const fetchSubmissions = async () => {
    if (!selectedSubject || !selectedExamType) {
      setAlert({
        open: true,
        message: 'Please select a subject and exam type first',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setSubmissionsLoading(true);
      
      // Call the API to get submissions for the selected subject and exam type
      const response = await fetch(
        `${config.API_BASE_URL}/submissions/subject/${selectedSubject}?examType=${selectedExamType}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY)}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const data = await response.json();
      
      // First sort by exam type
      let sortedData = sortSubmissionsByExamType(data);
      
      // Then apply user's current sort configuration
      if (sortConfig.key) {
        sortedData = applySortConfig(sortedData, sortConfig.key, sortConfig.direction);
      }
      
      setSubmissions(sortedData);
      setSubmissionsLoading(false);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      setAlert({
        open: true,
        message: 'Failed to fetch submissions. Please try again.',
        severity: 'error'
      });
      setSubmissionsLoading(false);
    }
  };

  // Function to sort submissions by exam type
  const sortSubmissionsByExamType = (submissions: Submission[]): Submission[] => {
    // Define sort order for exam types (e.g., midterm before assignment)
    const examTypePriority: Record<string, number> = {};
    
    // Assign priority based on order in EXAM_TYPES
    EXAM_TYPES.forEach((type, index) => {
      examTypePriority[type.id] = index;
    });
    
    return [...submissions].sort((a, b) => {
      // First sort by exam type priority
      const examTypeOrderDiff = (examTypePriority[a.examType] ?? 999) - (examTypePriority[b.examType] ?? 999);
      
      if (examTypeOrderDiff !== 0) {
        return examTypeOrderDiff;
      }
      
      // If same exam type, sort by submission date (most recent first)
      return new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime();
    });
  };

  // Extract sorting logic to a reusable function
  const applySortConfig = (data: Submission[], key: string, direction: 'asc' | 'desc'): Submission[] => {
    return [...data].sort((a, b) => {
      if (key === 'studentName') {
        const studentA = filteredStudents.find(s => s.id === a.studentId)?.name || '';
        const studentB = filteredStudents.find(s => s.id === b.studentId)?.name || '';
        return direction === 'asc' 
          ? studentA.localeCompare(studentB)
          : studentB.localeCompare(studentA);
      }
      
      if (key === 'submissionDate') {
        const dateA = new Date(a.submissionDate).getTime();
        const dateB = new Date(b.submissionDate).getTime();
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (key === 'score') {
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        return direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      }
      
      if (key === 'examType') {
        // Get the exam type names for better display
        const examTypeA = EXAM_TYPES.find(t => t.id === a.examType)?.name || a.examType;
        const examTypeB = EXAM_TYPES.find(t => t.id === b.examType)?.name || b.examType;
        return direction === 'asc' 
          ? examTypeA.localeCompare(examTypeB)
          : examTypeB.localeCompare(examTypeA);
      }
      
      // Default case
      return 0;
    });
  };

  // Function to handle sorting when a column header is clicked
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
    
    // Sort the submissions based on the selected column
    const sortedSubmissions = applySortConfig(submissions, key, direction);
    setSubmissions(sortedSubmissions);
  };

  // Helper to get exam type name from ID
  const getExamTypeName = (typeId: string): string => {
    return EXAM_TYPES.find(t => t.id === typeId)?.name || typeId;
  };

  // Update useEffect to fetch submissions when subject or exam type changes
  useEffect(() => {
    if (selectedSubject && selectedExamType) {
      fetchSubmissions();
    }
  }, [selectedSubject, selectedExamType]);

  // Add function to save feedback
  const saveSubmissionGrade = async (_studentId: string, score: number, feedbackText: string) => {
    if (!selectedSubmission || !selectedSubmission.id) {
      setAlert({
        open: true,
        message: 'No submission selected',
        severity: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      await gradeSubmission(selectedSubmission.id, {
        score,
        feedback: feedbackText
      });
      
      setAlert({
        open: true,
        message: 'Feedback saved successfully',
        severity: 'success'
      });
      
      // Refresh submissions data
      fetchSubmissions();
    } catch (error) {
      console.error('Error saving grade:', error);
      setAlert({
        open: true,
        message: 'Failed to save feedback. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a function to handle assignment creation success
  const handleAssignmentCreated = () => {
    console.log('Assignment created successfully');
    setAlert({
      open: true,
      message: 'Assignment created and saved to database successfully! Students will now be able to view and submit this assignment.',
      severity: 'success'
    });
    
    // You could also refresh the assignments list here if you want to show them
    // fetchAssignments();
  };

  return (
    <>
      <Header title="Teacher Portal" />
      <Container maxWidth="xl">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                Welcome, {teacherInfo?.name || 'Teacher'}!
              </Typography>
              
              {/* Batch Selection Section - More Prominent */}
              <Box sx={{ mb: 4, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Select Student Batch
                </Typography>
                
                {sessionRecoveryAttempted && !loading && (
                  <Box sx={{ mb: 2, p: 1, backgroundColor: '#fff8e1', borderRadius: 1, border: '1px solid #ffe57f' }}>
                    <Typography variant="body2" color="warning.main" sx={{ display: 'flex', alignItems: 'center' }}>
                      <Warning fontSize="small" sx={{ mr: 1 }} />
                      Your session may have expired. Please select a batch to continue working.
                    </Typography>
                  </Box>
                )}
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Batch</InputLabel>
                      <Select
                        value={selectedBatch}
                        onChange={handleBatchChange}
                        disabled={batchesLoading}
                      >
                        <MenuItem value="">
                          <em>Select a batch</em>
                        </MenuItem>
                        {availableBatches.map((batch) => (
                          <MenuItem key={batch.id} value={batch.id}>
                            {batch.name || batch.id}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Button
                      variant="contained"
                      startIcon={<People />}
                      onClick={() => fetchStudentsByBatch(selectedBatch)}
                      disabled={!selectedBatch || loading}
                      sx={{ mr: 2 }}
                    >
                      Load Students
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={handleRefreshAll}
                      disabled={loading || batchesLoading}
                    >
                      Refresh All Data
                    </Button>
                  </Grid>
                </Grid>
                
                {(loading || batchesLoading) && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                )}
                
                {/* Display message when no students are loaded */}
                {!loading && studentsList.length === 0 && (
                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff8e1', borderRadius: 1 }}>
                    <Typography>
                      No students loaded. Please select a batch and click "Load Students".
                    </Typography>
                    {sessionRecoveryAttempted && (
                      <Button 
                        variant="contained" 
                        color="primary"
                        size="small"
                        sx={{ mt: 1 }}
                        onClick={async () => {
                          const recoverySuccessful = await attemptSessionRecovery();
                          if (recoverySuccessful && selectedBatch) {
                            fetchStudentsByBatch(selectedBatch);
                          }
                        }}
                      >
                        Reconnect Session
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
              
              {/* Tabs Section */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 4 }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange}
                  aria-label="teacher portal tabs"
                >
                  <Tab label="Student List" icon={<Assessment />} iconPosition="start" />
                  <Tab label="Create Assignment" icon={<CloudUpload />} iconPosition="start" />
                  <Tab label="Grade Students" icon={<CheckCircle />} iconPosition="start" />
                </Tabs>
              </Box>
              
              {/* Tab Content */}
              <TabPanel value={tabValue} index={0}>
                {/* Student List Tab */}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Students in Selected Batch
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<Refresh />} 
                      onClick={handleRefresh} 
                      disabled={loading}
                      sx={{ ml: 2 }}
                    >
                      Refresh
                    </Button>
                  </Typography>

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Student ID</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Section</TableCell>
                            <TableCell>Batch</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                              <TableRow key={student.id}
                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                              >
                                <TableCell>{student.id}</TableCell>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.section}</TableCell>
                                <TableCell>{student.batchName || student.batch}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} align="center">
                                No students available. Please select a batch.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                {/* Create Assignment Tab */}
                <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
                  <TeacherAssignmentCreator 
                    subjects={teacherSubjects} 
                    examTypes={EXAM_TYPES}
                    onAssignmentCreated={handleAssignmentCreated} 
                  />
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                {/* Student List and Grading Tab */}
                <Box>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Subject</InputLabel>
                        <Select
                          value={selectedSubject}
                          onChange={handleSubjectChange}
                          disabled={subjectsLoading}
                        >
                          <MenuItem value="">
                            <em>Select a subject</em>
                          </MenuItem>
                          {teacherSubjects.map((subject) => (
                            <MenuItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Exam Type</InputLabel>
                        <Select
                          value={selectedExamType}
                          onChange={handleExamTypeChange}
                        >
                          <MenuItem value="">
                            <em>Select exam type</em>
                          </MenuItem>
                          {EXAM_TYPES.map((type) => (
                            <MenuItem key={type.id} value={type.id}>
                              {type.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  {selectedSubject && selectedExamType ? (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Student Submissions
                        <Button 
                          variant="outlined" 
                          size="small" 
                          startIcon={<Refresh />} 
                          onClick={fetchSubmissions} 
                          disabled={submissionsLoading}
                          sx={{ ml: 2 }}
                        >
                          Refresh
                        </Button>
                      </Typography>
                      
                      {submissionsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <TableContainer component={Paper} sx={{ mb: 4 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell 
                                  onClick={() => handleSort('studentName')}
                                  sx={{ cursor: 'pointer' }}
                                >
                                  Student Name
                                  {sortConfig.key === 'studentName' && (
                                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                  )}
                                </TableCell>
                                <TableCell 
                                  onClick={() => handleSort('examType')}
                                  sx={{ cursor: 'pointer' }}
                                >
                                  Exam Type
                                  {sortConfig.key === 'examType' && (
                                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                  )}
                                </TableCell>
                                <TableCell 
                                  onClick={() => handleSort('submissionDate')}
                                  sx={{ cursor: 'pointer' }}
                                >
                                  Submission Date
                                  {sortConfig.key === 'submissionDate' && (
                                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                  )}
                                </TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell 
                                  onClick={() => handleSort('score')}
                                  sx={{ cursor: 'pointer' }}
                                >
                                  Score
                                  {sortConfig.key === 'score' && (
                                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                                  )}
                                </TableCell>
                                <TableCell>Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {submissions.length > 0 ? (
                                // Only map through actual submissions rather than all students
                                submissions.map((submission) => {
                                  // Find the student associated with this submission
                                  const student = filteredStudents.find(s => s.id === submission.studentId);
                                  const isGraded = submission.graded;
                                  
                                  return (
                                    <TableRow key={submission.id}>
                                      <TableCell>{student ? student.name : `Student ID: ${submission.studentId}`}</TableCell>
                                      <TableCell>{getExamTypeName(submission.examType)}</TableCell>
                                      <TableCell>
                                        {new Date(submission.submissionDate).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell>
                                        {!isGraded && <Chip size="small" label="Not Graded" color="warning" />}
                                        {isGraded && <Chip size="small" label="Graded" color="success" />}
                                      </TableCell>
                                      <TableCell>{isGraded ? submission.score : '-'}</TableCell>
                                      <TableCell>
                                        <Button 
                                          variant="contained" 
                                          size="small" 
                                          onClick={() => setSelectedSubmission(submission)}
                                        >
                                          {isGraded ? 'Review' : 'Grade'}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={6} align="center">
                                    No submissions found for this subject and exam type.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                      
                      {/* Submission Grading Panel */}
                      {selectedSubmission && (
                        <Paper sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6">
                              {selectedSubmission.graded ? 'Reviewing' : 'Grading'} Submission
                            </Typography>
                            <Button 
                              size="small" 
                              onClick={() => {
                                setSelectedSubmission(null);
                                setFeedback('');
                              }}
                              variant="outlined"
                            >
                              Close
                            </Button>
                          </Box>
                          
                          <Divider sx={{ mb: 2 }} />
                          
                          {/* Student info */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              <strong>Student:</strong> {filteredStudents.find(s => s.id === selectedSubmission.studentId)?.name || 'Unknown'}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Submitted:</strong> {new Date(selectedSubmission.submissionDate).toLocaleString()}
                            </Typography>
                          </Box>
                          
                          {/* Submission Content */}
                          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 3, height: '200px', overflowY: 'auto' }}>
                            <Typography variant="body2" gutterBottom>
                              <strong>Submission Content:</strong>
                            </Typography>
                            <Typography variant="body2">
                              {selectedSubmission.submissionText || 'No content available'}
                            </Typography>
                          </Box>
                          
                          {/* Grading Tools - only show if not already graded */}
                          {!selectedSubmission.graded && (
                            <Box sx={{ mb: 3 }}>
                              <Typography variant="subtitle1" gutterBottom>
                                Grading Tools
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button 
                                  variant="contained" 
                                  color="success" 
                                  startIcon={<CheckCircle />}
                                  size="small"
                                >
                                  Correct
                                </Button>
                                <Button 
                                  variant="contained" 
                                  color="error" 
                                  startIcon={<Warning />}
                                  size="small"
                                >
                                  Incorrect
                                </Button>
                                <Button 
                                  variant="contained" 
                                  color="info" 
                                  size="small"
                                >
                                  Partially Correct
                                </Button>
                              </Box>
                            </Box>
                          )}
                          
                          {/* Score Assignment */}
                          <Box>
                            <Typography variant="subtitle1" gutterBottom>
                              {selectedSubmission.graded ? 'Score and Feedback' : 'Assign Score'}
                            </Typography>
                            
                            {/* Quick Grade Actions */}
                            {!selectedSubmission.graded && (
                              <Box sx={{ mb: 3 }}>
                                <Typography variant="body2" gutterBottom>
                                  Quick Grade Actions:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  <Button 
                                    variant="outlined" 
                                    size="small" 
                                    onClick={() => handleGradeChange(selectedSubmission.studentId, '100')}
                                  >
                                    A+ (100)
                                  </Button>
                                  <Button 
                                    variant="outlined" 
                                    size="small" 
                                    onClick={() => handleGradeChange(selectedSubmission.studentId, '90')}
                                  >
                                    A (90)
                                  </Button>
                                  <Button 
                                    variant="outlined" 
                                    size="small" 
                                    onClick={() => handleGradeChange(selectedSubmission.studentId, '80')}
                                  >
                                    B (80)
                                  </Button>
                                  <Button 
                                    variant="outlined" 
                                    size="small" 
                                    onClick={() => handleGradeChange(selectedSubmission.studentId, '70')}
                                  >
                                    C (70)
                                  </Button>
                                  <Button 
                                    variant="outlined" 
                                    size="small" 
                                    onClick={() => handleGradeChange(selectedSubmission.studentId, '60')}
                                  >
                                    D (60)
                                  </Button>
                                  <Button 
                                    variant="outlined" 
                                    size="small" 
                                    color="error"
                                    onClick={() => handleGradeChange(selectedSubmission.studentId, '0')}
                                  >
                                    F (0)
                                  </Button>
                                </Box>
                              </Box>
                            )}
                            
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} md={6}>
                                <TextField
                                  label="Score"
                                  type="number"
                                  fullWidth
                                  size="small"
                                  inputProps={{ min: 0, max: 100 }}
                                  value={grades[selectedSubmission.studentId] || selectedSubmission.score || ''}
                                  onChange={(e) => handleGradeChange(selectedSubmission.studentId, e.target.value)}
                                  helperText="Enter score out of 100"
                                  disabled={selectedSubmission.graded}
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  label="Feedback"
                                  fullWidth
                                  size="small"
                                  multiline
                                  rows={2}
                                  placeholder="Add feedback for the student"
                                  value={feedback || selectedSubmission.feedback || ''}
                                  onChange={(e) => setFeedback(e.target.value)}
                                  disabled={selectedSubmission.graded}
                                />
                              </Grid>
                            </Grid>
                            
                            {!selectedSubmission.graded && (
                              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button 
                                  variant="contained" 
                                  color="primary"
                                  onClick={() => {
                                    const score = Number(grades[selectedSubmission.studentId] || 0);
                                    saveSubmissionGrade(selectedSubmission.studentId, score, feedback);
                                  }}
                                  disabled={loading}
                                >
                                  {loading ? <CircularProgress size={24} /> : 'Save Grade'}
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Paper>
                      )}
                    </Box>
                  ) : (
                    <Box sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography>
                        Please select a subject and exam type to view and grade student submissions.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </TabPanel>
            </Paper>
          </Grid>
        </Grid>

        <Snackbar
          open={alert.open}
          autoHideDuration={6000}
          onClose={() => setAlert({...alert, open: false})}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setAlert({...alert, open: false})} 
            severity={alert.severity}
            sx={{ width: '100%' }}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default TeacherPortal;