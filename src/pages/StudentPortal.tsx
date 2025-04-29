import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  Alert,
  Button,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from "@mui/lab";
import {
  School,
  TrendingUp,
  Grade as GradeIcon,
  Refresh,
  Assignment,
  Psychology,
} from "@mui/icons-material";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";
import { getStudentProfile, getStudentSubmissions, getStudentById } from "../api";
import { Student, StudentSubmission, Subject } from "../types/university";
import { useAuth } from "../context/AuthContext";
import { attemptSessionRecovery } from "../api/studentService";
import config from "../config/environment";
import { EXAM_TYPES } from "../constants/universityData";
import StudentAssignmentList from '../components/StudentAssignmentList';
import ProfileChatbot from '../components/ProfileChatbot';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StudentPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<Student & { 
    submissions: StudentSubmission[];
    subjects?: Subject[]; 
  } | null>(null);
  const [sessionRecoveryAttempted, setSessionRecoveryAttempted] = useState<boolean>(false);
  const [alert, setAlert] = useState<{open: boolean; message: string; severity: 'success' | 'info' | 'warning' | 'error'}>({
    open: false,
    message: '',
    severity: 'info'
  });
  const [selectedExamType, setSelectedExamType] = useState<string>("");
  const navigate = useNavigate();
  const { currentUser } = useAuth();

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
        
        // Now try to fetch student data again
        fetchStudentData();
      } else {
        console.log('Could not recover session silently, but continuing with local data');
        setAlert({
          open: true,
          message: 'Your session may have expired. Please try refreshing the data.',
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

  // Extract fetchStudentData outside of useEffect for reuse
  const fetchStudentData = async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Check if user is logged in
      if (!currentUser) {
        navigate("/login");
        return;
      }

      if (currentUser.role !== "student") {
        navigate("/login");
        return;
      }

      let profileData;
      let errorMessage = '';
      
      try {
        // Try to get profile from backend API first
        const profileResponse = await getStudentProfile();
        profileData = profileResponse.data;
      } catch (profileError: any) {
        console.error('Error fetching from profile API:', profileError);
        errorMessage = 'Error fetching profile: ' + (profileError.response?.data?.message || profileError.message);
        
        // Check if this is an authentication error
        if (profileError.response && (profileError.response.status === 401 || profileError.response.status === 403)) {
          // Try session recovery if auth error and not attempted yet
          if (!sessionRecoveryAttempted) {
            handleSessionRecovery();
            throw new Error('Session expired. Attempting recovery...');
          }
        }
        
        // If profile API fails and we have a Firebase user ID as backup
        if (currentUser.id) {
          try {
            // Try to get student by ID directly
            const studentResponse = await getStudentById(currentUser.id);
            profileData = studentResponse.data;
          } catch (studentError: any) {
            console.error('Error fetching student by ID:', studentError);
            errorMessage += '\nError fetching by ID: ' + (studentError.response?.data?.message || studentError.message);
            throw new Error(errorMessage);
          }
        } else {
          throw new Error(errorMessage);
        }
      }

      // Now get submissions
      try {
        const submissionsResponse = await getStudentSubmissions(currentUser.id);
        const submissions = submissionsResponse.data || [];

        setStudentData({
          ...profileData,
          submissions: submissions
        });
      } catch (submissionsError: any) {
        console.error('Error fetching submissions:', submissionsError);
        // Even if submissions fail, we still have the profile data
        setStudentData({
          ...profileData,
          submissions: []
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch student data:', error);
      setError(error.message || 'Failed to load student data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is logged in and is a student
    if (!currentUser) {
      console.log('No student info found, redirecting to login');
      navigate("/login");
      return;
    }
    
    if (currentUser.role !== "student") {
      console.log('User is not a student, redirecting to login');
      navigate("/login");
      return;
    }
    
    // Check token status and attempt recovery if needed
    const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
    if (!token && currentUser) {
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
    
    // Fetch student data
    fetchStudentData();
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('auth:error', handleAuthError as EventListener);
      window.removeEventListener('auth:warning', handleAuthWarning as EventListener);
    };
  }, [navigate, currentUser, sessionRecoveryAttempted]);

  const calculateGrade = (score: number): string => {
    if (typeof score !== 'number' || isNaN(score) || score < 0) {
      return '-';
    }
    
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const calculateAverageScore = (): number => {
    if (!studentData?.submissions || studentData.submissions.length === 0)
      return 0;

    const scores = studentData.submissions
      .filter((sub) => sub.score !== undefined && sub.score !== null)
      .map((sub) => sub.score as number);

    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const handleExamTypeChange = (event: SelectChangeEvent) => {
    setSelectedExamType(event.target.value as string);
  };

  // Filter submissions based on selected exam type
  const filteredSubmissions = selectedExamType 
    ? studentData?.submissions.filter(sub => sub.examType === selectedExamType) 
    : studentData?.submissions;

  if (loading) {
    return (
      <Box sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Header title="Student Portal" />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Card>
            <CardContent>
              <Alert 
                severity="error" 
                sx={{ mb: 2 }}
                action={
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={fetchStudentData}
                    startIcon={<Refresh />}
                  >
                    Try Again
                  </Button>
                }
              >
                {error}
              </Alert>
              
              {sessionRecoveryAttempted && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    There might be an issue with your session. You can try:
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={async () => {
                      const recoverySuccessful = await attemptSessionRecovery();
                      if (recoverySuccessful) {
                        fetchStudentData();
                      }
                    }}
                    sx={{ mr: 2, mt: 1 }}
                  >
                    Reconnect Session
                  </Button>
                  <Button 
                    variant="outlined"
                    onClick={() => navigate('/login')}
                    sx={{ mt: 1 }}
                  >
                    Return to Login
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  if (!studentData) {
    return (
      <Box>
        <Header title="Student Portal" />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Card>
            <CardContent>
              <Alert 
                severity="warning"
                action={
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={fetchStudentData}
                  >
                    Refresh
                  </Button>
                }
              >
                No student data found. Please try refreshing.
              </Alert>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  const avgScore = calculateAverageScore();

  return (
    <>
      <Header title="Student Portal" />
      <Container maxWidth="xl">
        {sessionRecoveryAttempted && (
          <Alert 
            severity="info" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small"
                onClick={fetchStudentData}
              >
                Refresh
              </Button>
            }
          >
            Your session was recovered. If you experience any issues, try refreshing the data.
          </Alert>
        )}
        
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <School sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h4">
                      Welcome, {studentData.name}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                      Student ID: {studentData.id} | Section: {studentData.section}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Latest Submissions
                        </Typography>
                        {studentData.submissions.length > 0 ? (
                          <Box>
                            {studentData.submissions.slice(0, 5).map((submission, index) => (
                              <Box key={index} sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="primary">
                                  {submission.subjectId} - {submission.examType}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Score: {submission.score || 'Pending'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Grade: {submission.score ? calculateGrade(submission.score) : '-'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Submitted: {new Date(submission.submissionDate).toLocaleDateString()}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No submissions yet
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Performance Overview
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h4" color="primary">
                            {avgScore > 0 ? `${avgScore}%` : '-'}
                          </Typography>
                          <Typography variant="subtitle1">
                            Overall Average Score
                          </Typography>
                        </Box>
                        {studentData.submissions.length > 0 ? (
                          <Timeline>
                            {studentData.submissions.map((submission, index) => (
                              <TimelineItem key={index}>
                                <TimelineSeparator>
                                  <TimelineDot 
                                    color={(submission.score && submission.score >= 70) ? "success" : 
                                           (submission.score ? "error" : "grey")} 
                                  />
                                  {index < studentData.submissions.length - 1 && <TimelineConnector />}
                                </TimelineSeparator>
                                <TimelineContent>
                                  <Typography variant="subtitle1">
                                    {submission.subjectId} - {submission.examType}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Score: {submission.score || 'Pending'} | 
                                    Grade: {submission.score ? calculateGrade(submission.score) : '-'}
                                  </Typography>
                                </TimelineContent>
                              </TimelineItem>
                            ))}
                          </Timeline>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No performance data available yet
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Tabs
                  value={tabValue}
                  onChange={(_: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
                  variant="fullWidth"
                >
                  <Tab icon={<GradeIcon />} label="Grades" />
                  <Tab icon={<TrendingUp />} label="Progress" />
                  <Tab icon={<Assignment />} label="Assignments" />
                  <Tab icon={<Psychology />} label="Profile Chatbot" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Performance Summary
                    </Typography>
                    <Box sx={{ display: "flex", gap: 4 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Average Score
                        </Typography>
                        <Typography variant="h6">
                          {avgScore > 0 ? `${avgScore}%` : '-'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Grade
                        </Typography>
                        <Typography variant="h6">
                          {avgScore > 0 ? calculateGrade(avgScore) : '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <FormControl sx={{ mb: 3, minWidth: 200 }}>
                    <InputLabel>Filter by Exam Type</InputLabel>
                    <Select
                      value={selectedExamType}
                      onChange={handleExamTypeChange}
                      label="Filter by Exam Type"
                    >
                      <MenuItem value="">All Types</MenuItem>
                      {EXAM_TYPES.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Subject Code</TableCell>
                          <TableCell>Subject Name</TableCell>
                          <TableCell>Exam Type</TableCell>
                          <TableCell>Score</TableCell>
                          <TableCell>Grade</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredSubmissions && filteredSubmissions.length > 0 ? (
                          filteredSubmissions.map((submission, index) => (
                            <TableRow key={index}>
                              <TableCell>{submission.subjectId}</TableCell>
                              <TableCell>{submission.subjectName}</TableCell>
                              <TableCell>{submission.examType}</TableCell>
                              <TableCell>{submission.score !== undefined && submission.score !== null ? submission.score : '-'}</TableCell>
                              <TableCell>{submission.score !== undefined && submission.score !== null ? calculateGrade(submission.score) : '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              No grades available for the selected filter
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <Typography variant="h6" gutterBottom>
                    Progress Tracking
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Your performance shows a positive trend. Keep up the good
                    work!
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 3, bgcolor: "background.default" }}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      Tips for improvement:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <Box component="li" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          Review your lower-scored submissions.
                        </Typography>
                      </Box>
                      <Box component="li" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          Allocate more time to challenging subjects.
                        </Typography>
                      </Box>
                      <Box component="li">
                        <Typography variant="body2">
                          Seek guidance from your professors during office
                          hours.
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <StudentAssignmentList />
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                  {studentData ? (
                    <ProfileChatbot 
                      studentId={studentData.id} 
                      subjects={studentData.subjects || []}
                      apiAvailable={true}
                      studentName={studentData.name}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress />
                    </Box>
                  )}
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
      
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
    </>
  );
};

export default StudentPortal;
