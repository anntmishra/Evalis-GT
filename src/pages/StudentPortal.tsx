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
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from "@mui/lab";
import { School, TrendingUp, Grade as GradeIcon } from "@mui/icons-material";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";
import { getStudentProfile, getStudentSubmissions } from "../api";
import { Student, StudentSubmission } from "../types/university";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const StudentPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<Student & { submissions: StudentSubmission[] } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        // Get logged in user data
        const userDataStr = localStorage.getItem("currentUser");
        if (!userDataStr) {
          navigate("/login");
          return;
        }

        const userData = JSON.parse(userDataStr);
        if (!userData || typeof userData !== 'object' || !userData.id || !userData.role) {
          navigate("/login");
          return;
        }

        if (userData.role !== "student") {
          navigate("/login");
          return;
        }

        // Fetch student profile and submissions
        const [profileResponse, submissionsResponse] = await Promise.all([
          getStudentProfile(),
          getStudentSubmissions(userData.id)
        ]);

        const studentProfile = profileResponse.data;
        const submissions = submissionsResponse.data;

        setStudentData({
          ...studentProfile,
          submissions: submissions || []
        });
      } catch (error) {
        console.error('Failed to fetch student data:', error);
        setError('Failed to load student data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [navigate]);

  const calculateGrade = (score: number): string => {
    if (typeof score !== 'number' || isNaN(score) || score < 0) {
      return 'N/A';
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
      <Box sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!studentData) {
    return (
      <Box sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}>
        <Alert severity="warning">No student data found. Please log in again.</Alert>
      </Box>
    );
  }

  const avgScore = calculateAverageScore();

  return (
    <Box>
      <Header title="Student Portal" />

      <Container maxWidth="lg" sx={{ py: 4 }}>
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
                                  Grade: {submission.score ? calculateGrade(submission.score) : 'Pending'}
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
                            {avgScore}%
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
                                    Grade: {submission.score ? calculateGrade(submission.score) : 'Pending'}
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
                          {avgScore}%
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Grade
                        </Typography>
                        <Typography variant="h6">
                          {calculateGrade(avgScore)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Subject Code</TableCell>
                          <TableCell>Subject Name</TableCell>
                          <TableCell>Exam Type</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell align="right">Grade</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {studentData.submissions.map(
                          (submission: StudentSubmission, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{submission.subjectId}</TableCell>
                              <TableCell>
                                {submission.subjectName || 'Unknown Subject'}
                              </TableCell>
                              <TableCell>{submission.examType}</TableCell>
                              <TableCell align="right">
                                {submission.score || 'Pending'}
                              </TableCell>
                              <TableCell align="right">
                                {submission.score ? calculateGrade(submission.score) : 'N/A'}
                              </TableCell>
                            </TableRow>
                          )
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
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default StudentPortal;
