import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { getUserProfile, getTeacherById, getSubjects, getStudents, getBatches, getStudentSubmissions } from '../api';
import SubmissionChecker from './SubmissionChecker';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[3],
}));

const ProfileCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[3],
}));

const SubjectCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[2],
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const TeacherPortal = () => {
  const [teacher, setTeacher] = useState(null);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  // Fetch teacher profile
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['teacherProfile'],
    queryFn: getUserProfile,
  });

  // Fetch all subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: getSubjects,
  });

  // Fetch all students
  const { data: allStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  });

  // Fetch all batches
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: getBatches,
  });

  // Fetch submissions when a student is selected
  useEffect(() => {
    if (selectedStudent?.id) {
      getStudentSubmissions(selectedStudent.id)
        .then(response => {
          setSubmissions(response.data);
        })
        .catch(error => {
          console.error('Error fetching submissions:', error);
        });
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (profile?.id) {
      // Fetch teacher details
      getTeacherById(profile.id)
        .then(response => {
          setTeacher(response.data);
          // Filter subjects assigned to this teacher
          if (subjects) {
            const teacherSubjects = subjects.filter(subject => 
              subject.teachers?.some(t => t.id === profile.id)
            );
            setAssignedSubjects(teacherSubjects);
            if (teacherSubjects.length > 0) {
              setSelectedSubject(teacherSubjects[0]);
            }
          }
        })
        .catch(error => {
          console.error('Error fetching teacher details:', error);
        });
    }
  }, [profile, subjects]);

  useEffect(() => {
    if (selectedSubject && allStudents) {
      // Filter students based on the selected subject's section and batch
      const filteredStudents = allStudents.filter(student => 
        student.section === selectedSubject.section && 
        student.batch === selectedSubject.batch
      );
      setStudents(filteredStudents);
    }
  }, [selectedSubject, allStudents]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    // Reset selections when changing tabs
    if (newValue === 2) {
      setSelectedStudent(null);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setSelectedTab(2); // Switch to submissions tab
  };

  const handleGradeSubmission = async (submissionId, gradeData) => {
    try {
      // Call your API to update the submission grade
      await gradeSubmission(submissionId, gradeData);
      // Refresh submissions
      if (selectedStudent?.id) {
        const response = await getStudentSubmissions(selectedStudent.id);
        setSubmissions(response.data);
      }
    } catch (error) {
      console.error('Error grading submission:', error);
    }
  };

  if (profileLoading || subjectsLoading || studentsLoading || batchesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (profileError) {
    return (
      <Container maxWidth="md">
        <Alert severity="error">Error loading profile. Please try again later.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Teacher Portal
        </Typography>

        <Grid container spacing={3}>
          {/* Teacher Profile */}
          <Grid item xs={12} md={4}>
            <ProfileCard>
              <CardContent>
                <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                  <Avatar
                    sx={{ width: 120, height: 120, mb: 2 }}
                    alt={teacher?.name}
                    src="/static/images/avatar/1.jpg"
                  />
                  <Typography variant="h5" component="h2" gutterBottom>
                    {teacher?.name}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    {teacher?.email}
                  </Typography>
                  <Chip
                    label={teacher?.role}
                    color="primary"
                    sx={{ mt: 1 }}
                  />
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Contact Information
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Email: {teacher?.email}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ID: {teacher?.id}
                  </Typography>
                </Box>
              </CardContent>
            </ProfileCard>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={8}>
            <StyledPaper>
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{ mb: 3 }}
              >
                <Tab label="Assigned Subjects" />
                <Tab label="Students" />
                <Tab label="Submissions" />
              </Tabs>

              {selectedTab === 0 && (
                <Grid container spacing={2}>
                  {assignedSubjects.map((subject) => (
                    <Grid item xs={12} sm={6} key={subject.id}>
                      <SubjectCard
                        onClick={() => setSelectedSubject(subject)}
                        sx={{
                          cursor: 'pointer',
                          border: selectedSubject?.id === subject.id ? '2px solid' : 'none',
                          borderColor: 'primary.main',
                        }}
                      >
                        <CardContent>
                          <Typography variant="h6" component="h3" gutterBottom>
                            {subject.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            Code: {subject.id}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            Section: {subject.section}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            Credits: {subject.credits}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {subject.description}
                          </Typography>
                        </CardContent>
                      </SubjectCard>
                    </Grid>
                  ))}
                  {assignedSubjects.length === 0 && (
                    <Grid item xs={12}>
                      <Alert severity="info">
                        No subjects assigned yet. Please contact the administrator.
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              )}

              {selectedTab === 1 && (
                <Box>
                  {selectedSubject ? (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Students in {selectedSubject.name} ({selectedSubject.section})
                      </Typography>
                      <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>ID</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell>Email</TableCell>
                              <TableCell>Batch</TableCell>
                              <TableCell>Action</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {students.map((student) => (
                              <TableRow 
                                key={student.id}
                                sx={{
                                  cursor: 'pointer',
                                  backgroundColor: selectedStudent?.id === student.id ? 'action.selected' : 'inherit',
                                }}
                                onClick={() => handleStudentSelect(student)}
                              >
                                <TableCell>{student.id}</TableCell>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>{student.batch}</TableCell>
                                <TableCell>
                                  <Chip
                                    label="View Submissions"
                                    color="primary"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStudentSelect(student);
                                    }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Alert severity="info">
                      Please select a subject to view students
                    </Alert>
                  )}
                </Box>
              )}

              {selectedTab === 2 && (
                <Box>
                  {selectedStudent ? (
                    <>
                      <Typography variant="h6" gutterBottom>
                        Submissions for {selectedStudent.name}
                      </Typography>
                      {submissions.length > 0 ? (
                        submissions.map((submission) => (
                          <Box key={submission.id} mb={3}>
                            <SubmissionChecker
                              submission={submission}
                              onGrade={(gradeData) => handleGradeSubmission(submission.id, gradeData)}
                            />
                          </Box>
                        ))
                      ) : (
                        <Alert severity="info">
                          No submissions found for this student
                        </Alert>
                      )}
                    </>
                  ) : (
                    <Alert severity="info">
                      Please select a student to view their submissions
                    </Alert>
                  )}
                </Box>
              )}
            </StyledPaper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default TeacherPortal; 