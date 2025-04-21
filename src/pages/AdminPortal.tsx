import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Paper,
  Snackbar,
  Alert,
  Divider,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@mui/material";
import {
  SupervisorAccount,
  School,
  CloudUpload,
  Group,
  Person,
  Refresh,
  Add,
  People,
  Delete as DeleteIcon,
  Edit as EditIcon
} from "@mui/icons-material";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";
import {
  BATCHES,
} from "../data/universityData";
import { Student, Subject, Teacher } from "../types/university";
import TeacherAssignment from "../components/TeacherAssignment";
import StudentImporter from "../components/StudentImporter";
import TeacherImporter from "../components/TeacherImporter";
import StudentForm from "../components/StudentForm";
import { getTeachers, assignSubject, removeSubject, createTeacher, updateTeacher, deleteTeacher } from "../api/teacherService";
import { getAllSubjects, createSubject } from "../api/subjectService";
import { 
  getAllStudents, 
  getStudentsByBatch, 
  createStudent, 
  updateStudent, 
  deleteStudent 
} from "../api/studentService";
import { seedSubjectsToDatabase } from "../utils/seedSubjects";
import { seedBatches } from "../api/batchService";
// @ts-ignore
import config from "../config/environment";

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
      id={`admin-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const AdminPortal: React.FC = (): React.ReactElement => {
  const [tabValue, setTabValue] = useState(0);
  const [notification, setNotification] = useState({ 
    open: false, 
    message: "", 
    severity: "success" as "success" | "error" 
  });
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [seedingSubjects, setSeedingSubjects] = useState(false);
  const [seedingBatches, setSeedingBatches] = useState(false);
  
  // Student data state
  const [selectedBatch, setSelectedBatch] = useState('2023-2027');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentError, setStudentError] = useState<string | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated as admin
    const userDataStr = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
    console.log('Checking admin auth, found user data:', userDataStr);
    
    if (!userDataStr) {
      console.log('No user data found, redirecting to login');
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(userDataStr);
      console.log('Parsed user data:', userData);
      
      if (userData.role !== "admin") {
        console.log('User is not admin, redirecting to login');
        navigate("/login");
      } else {
        console.log('Admin access confirmed');
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate("/login");
    }
  }, [navigate]);

  // Fetch teachers from API
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setLoading(true);
        const response = await getTeachers();
        // Transform teacher data to match the required format
        const fetchedTeachers = response.map((teacher: any) => ({
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          subjects: teacher.Subjects ? teacher.Subjects.map((subject: any) => subject.id) : []
        }));
        setTeachers(fetchedTeachers);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        setNotification({
          open: true,
          message: "Failed to load teachers. Please try again.",
          severity: "error"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  // Fetch subjects from API
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Fetch students based on selected batch
  useEffect(() => {
    fetchStudents(selectedBatch);
  }, [selectedBatch]);

  // Function to fetch students
  const fetchStudents = async (batchId: string) => {
    setStudentsLoading(true);
    try {
      let response;
      if (batchId) {
        response = await getStudentsByBatch(batchId);
      } else {
        response = await getAllStudents();
      }
      setStudents(response);
      console.log("Students loaded from API:", response);
    } catch (error) {
      console.error("Error fetching students:", error);
      setNotification({
        open: true,
        message: "Failed to load students. Please try again.",
        severity: "error"
      });
    } finally {
      setStudentsLoading(false);
    }
  };

  // Function to fetch subjects
  const fetchSubjects = async () => {
    try {
      setSubjectsLoading(true);
      const response = await getAllSubjects();
      setSubjects(response);
      console.log("Subjects loaded from API:", response);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setNotification({
        open: true,
        message: "Failed to load subjects. Please try again.",
        severity: "error"
      });
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Function to seed subjects to database
  const handleSeedSubjects = async () => {
    try {
      setSeedingSubjects(true);
      const result = await seedSubjectsToDatabase();
      setNotification({
        open: true,
        message: `Subjects seeded successfully! (${result.succeeded} added, ${result.failed} failed)`,
        severity: "success"
      });
      // Refresh the subjects list
      await fetchSubjects();
    } catch (error) {
      console.error("Error seeding subjects:", error);
      setNotification({
        open: true,
        message: "Failed to seed subjects. Please try again.",
        severity: "error"
      });
    } finally {
      setSeedingSubjects(false);
    }
  };

  // Function to seed batches to database
  const handleSeedBatches = async () => {
    try {
      setSeedingBatches(true);
      const result = await seedBatches();
      setNotification({
        open: true,
        message: `Batches seeded successfully! (${result.succeeded} added, ${result.failed} failed)`,
        severity: "success"
      });
    } catch (error) {
      console.error("Error seeding batches:", error);
      setNotification({
        open: true,
        message: "Failed to seed batches. Please try again.",
        severity: "error"
      });
    } finally {
      setSeedingBatches(false);
    }
  };

  // Common error handler function
  const handleApiError = (error: any, defaultMessage: string) => {
    console.error("API Error:", error);
    
    // Extract error message from various possible formats
    const errorMessage = 
      error.response?.data?.message || // Standard API error format
      error.message || // Error object message
      (typeof error === 'string' ? error : defaultMessage); // Fallback
    
    setNotification({
      open: true,
      message: errorMessage,
      severity: "error"
    });
  };

  // Handle teacher subject assignment
  const handleAssignSubject = async (teacherId: string, subjectId: string) => {
    try {
      // First check if the teacher already has this subject
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher && teacher.subjects.includes(subjectId)) {
        setNotification({
          open: true,
          message: "This teacher already has this subject assigned",
          severity: "error"
        });
        return;
      }
      
      console.log(`Assigning subject ${subjectId} to teacher ${teacherId}...`);
      // Check if we have a token without showing it in logs
      const hasToken = !!localStorage.getItem("userToken");
      console.log("Auth token present:", hasToken);
      
      // Call the API
      const response = await assignSubject(teacherId, subjectId);
      console.log("Subject assigned response:", response);
      
      // Update the local state
      setTeachers(prevTeachers => {
        return prevTeachers.map(teacher => {
          if (teacher.id === teacherId) {
            return {
              ...teacher,
              subjects: [...teacher.subjects, subjectId]
            };
          }
          return teacher;
        });
      });
      
      setNotification({
        open: true,
        message: "Subject assigned successfully",
        severity: "success"
      });
    } catch (error: any) {
      console.log("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      handleApiError(error, "Failed to assign subject. Please try again.");
    }
  };

  // Handle teacher subject removal
  const handleRemoveSubject = async (teacherId: string, subjectId: string) => {
    try {
      // Call the API
      const response = await removeSubject(teacherId, subjectId);
      console.log("Subject removed response:", response);
      
      // Update the local state
      setTeachers(prevTeachers => {
        return prevTeachers.map(teacher => {
          if (teacher.id === teacherId) {
            return {
              ...teacher,
              subjects: teacher.subjects.filter(id => id !== subjectId)
            };
          }
          return teacher;
        });
      });
      
      setNotification({
        open: true,
        message: "Subject removed successfully",
        severity: "success"
      });
    } catch (error: any) {
      handleApiError(error, "Failed to remove subject. Please try again.");
    }
  };

  // Handle adding a new teacher
  const handleAddTeacher = async (teacher: Teacher) => {
    try {
      const response = await createTeacher(teacher);
      const newTeacher = {
        id: response.id,
        name: response.name,
        email: response.email,
        subjects: response.Subjects ? response.Subjects.map((subject: any) => subject.id) : []
      };
      
      setTeachers(prevTeachers => [...prevTeachers, newTeacher]);
      
      setNotification({
        open: true,
        message: "Teacher added successfully",
        severity: "success"
      });
    } catch (error: any) {
      handleApiError(error, "Failed to add teacher. Please try again.");
    }
  };

  // Handle editing an existing teacher
  const handleEditTeacher = async (updatedTeacher: Teacher) => {
    try {
      await updateTeacher(updatedTeacher.id, updatedTeacher);
      
      setTeachers(prevTeachers => {
        return prevTeachers.map(teacher => {
          if (teacher.id === updatedTeacher.id) {
            return updatedTeacher;
          }
          return teacher;
        });
      });
      
      setNotification({
        open: true,
        message: "Teacher updated successfully",
        severity: "success"
      });
    } catch (error: any) {
      handleApiError(error, "Failed to update teacher. Please try again.");
    }
  };

  // Handle deleting a teacher
  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      await deleteTeacher(teacherId);
      
      // Remove the teacher from the state
      setTeachers(prevTeachers => prevTeachers.filter(teacher => teacher.id !== teacherId));
      
      setNotification({
        open: true,
        message: "Teacher deleted successfully",
        severity: "success"
      });
    } catch (error: any) {
      handleApiError(error, "Failed to delete teacher. Please try again.");
    }
  };

  // Handle importing students
  const handleImportStudents = (batchId: string, newStudents: Student[]) => {
    // In a real application, this would call an API to save the students
    console.log(`Importing ${newStudents.length} students to batch ${batchId}:`, newStudents);
    setNotification({
      open: true,
      message: `Successfully imported ${newStudents.length} students to batch ${batchId}`,
      severity: "success"
    });
    
    // If the imported batch matches the currently displayed batch, refresh immediately
    if (batchId === selectedBatch) {
      fetchStudents(selectedBatch);
    }
  };

  // Handle importing teachers
  const handleImportTeachers = async (importedTeachers: Teacher[]) => {
    try {
      // In a real application, this would call an API to save the teachers
      console.log(`Importing ${importedTeachers.length} teachers:`, importedTeachers);
      
      // Add imported teachers to the existing list
      // Note: In a real implementation, you would make API calls to create these teachers
      setTeachers(prevTeachers => {
        // Filter out any duplicates by ID
        const filteredPrevTeachers = prevTeachers.filter(
          teacher => !importedTeachers.some(imported => imported.id === teacher.id)
        );
        return [...filteredPrevTeachers, ...importedTeachers];
      });
      
      setNotification({
        open: true,
        message: `Successfully imported ${importedTeachers.length} teachers`,
        severity: "success"
      });
    } catch (error) {
      console.error("Error importing teachers:", error);
      setNotification({
        open: true,
        message: "Failed to import teachers. Please try again.",
        severity: "error"
      });
    }
  };

  // Group subjects by section for display
  const getSubjectsBySection = () => {
    if (!subjects.length) return {};
    
    return subjects.reduce((acc: Record<string, Subject[]>, subject) => {
      const section = subject.section || 'Unknown';
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(subject);
      return acc;
    }, {});
  };

  // Handle adding a new student
  const handleAddStudent = () => {
    setEditingStudent(undefined);
    setStudentError(undefined);
    setStudentFormOpen(true);
  };

  // Handle editing a student
  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentError(undefined);
    setStudentFormOpen(true);
  };

  // Handle saving a student (add or edit)
  const handleSaveStudent = async (student: Student) => {
    setSavingStudent(true);
    setStudentError(undefined);
    
    try {
      if (editingStudent) {
        // Update existing student
        await updateStudent(student.id, student);
        
        // Fetch updated students list 
        await fetchStudents(selectedBatch);
        
        setNotification({
          open: true,
          message: `Student ${student.name} updated successfully`,
          severity: "success"
        });
      } else {
        // Add new student
        // Check if ID already exists
        if (students.some(s => s.id === student.id)) {
          setStudentError("A student with this ID already exists");
          setSavingStudent(false);
          return;
        }
        
        // Set password equal to student ID if not provided
        const studentWithPassword = {
          ...student,
          password: student.id // Default password is the student ID
        };
        
        console.log('Submitting student with data:', studentWithPassword);
        await createStudent(studentWithPassword);
        
        // Fetch updated students list to ensure we have the latest data
        await fetchStudents(selectedBatch);
        
        setNotification({
          open: true,
          message: `Student ${student.name} added successfully`,
          severity: "success"
        });
      }
      
      setSavingStudent(false);
      setStudentFormOpen(false);
    } catch (error: any) {
      console.error("Error saving student:", error);
      const errorMessage = error.response?.data?.message || "Failed to save student. Please try again.";
      setStudentError(errorMessage);
      setSavingStudent(false);
    }
  };

  // Handle showing delete confirmation
  const handleDeleteConfirm = (student: Student) => {
    setStudentToDelete(student);
    setDeleteConfirmOpen(true);
  };

  // Handle actual deletion
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    try {
      await deleteStudent(studentToDelete.id);
      
      // Fetch updated students list
      await fetchStudents(selectedBatch);
      
      setNotification({
        open: true,
        message: `Student ${studentToDelete.name} deleted successfully`,
        severity: "success"
      });
      
      setDeleteConfirmOpen(false);
      setStudentToDelete(null);
    } catch (error: any) {
      console.error("Error deleting student:", error);
      handleApiError(error, "Failed to delete student. Please try again.");
    }
  };

  return (
    <Box>
      <Header title="Admin Dashboard" />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <SupervisorAccount sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h4">Admin Control Panel</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />

                <Tabs
                  value={tabValue}
                  onChange={(_: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
                  variant="fullWidth"
                >
                  <Tab icon={<School />} label="Teacher Assignment" />
                  <Tab icon={<Person />} label="Teacher Import" />
                  <Tab icon={<CloudUpload />} label="Student Import" />
                  <Tab icon={<Group />} label="Data Management" />
                  <Tab icon={<People />} label="Students" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                  {subjectsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : subjects.length > 0 ? (
                    <TeacherAssignment 
                      teachers={teachers}
                      subjects={subjects}
                      onAssignSubject={handleAssignSubject}
                      onRemoveSubject={handleRemoveSubject}
                      onAddTeacher={handleAddTeacher}
                      onEditTeacher={handleEditTeacher}
                      onDeleteTeacher={handleDeleteTeacher}
                    />
                  ) : (
                    <Box sx={{ textAlign: 'center', my: 4 }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No subjects found in the database
                      </Typography>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSeedSubjects}
                        disabled={seedingSubjects}
                        startIcon={seedingSubjects ? <CircularProgress size={20} /> : <Add />}
                        sx={{ mt: 2 }}
                      >
                        {seedingSubjects ? 'Adding Subjects...' : 'Add Default Subjects'}
                      </Button>
                    </Box>
                  )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <TeacherImporter 
                    onImportTeachers={handleImportTeachers}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <StudentImporter 
                    batches={BATCHES}
                    onImportStudents={handleImportStudents}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" gutterBottom>
                              Batch Overview
                            </Typography>
                            <Button 
                              variant="outlined" 
                              size="small"
                              onClick={handleSeedBatches}
                              disabled={seedingBatches}
                              startIcon={seedingBatches ? <CircularProgress size={16} /> : <Add />}
                            >
                              {seedingBatches ? 'Seeding...' : 'Seed Batches'}
                            </Button>
                          </Box>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                              {BATCHES.map((batch) => (
                                <Box component="li" key={batch.id} sx={{ mb: 1 }}>
                                  <Typography variant="body1">
                                    <strong>{batch.name}</strong> ({batch.id})
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Paper>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                              Subject Overview
                            </Typography>
                            <Button 
                              size="small" 
                              startIcon={<Refresh />} 
                              onClick={fetchSubjects}
                              disabled={subjectsLoading}
                            >
                              Refresh
                            </Button>
                          </Box>
                          {subjectsLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                              <CircularProgress />
                            </Box>
                          ) : subjects.length > 0 ? (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                              {Object.entries(getSubjectsBySection()).map(([section, sectionSubjects]) => (
                                <Box key={section} sx={{ mb: 3 }}>
                                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Section: {section}
                                  </Typography>
                                  <Box component="ul" sx={{ pl: 2 }}>
                                    {sectionSubjects.map((subject) => (
                                      <Box component="li" key={subject.id} sx={{ mb: 0.5 }}>
                                        <Typography variant="body2">
                                          {subject.name} ({subject.id})
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              ))}
                            </Paper>
                          ) : (
                            <Box sx={{ textAlign: 'center', p: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                No subjects found in the database
                              </Typography>
                              <Button 
                                variant="outlined" 
                                size="small" 
                                onClick={handleSeedSubjects}
                                disabled={seedingSubjects}
                                startIcon={seedingSubjects ? <CircularProgress size={16} /> : <Add />}
                                sx={{ mt: 1 }}
                              >
                                Add Default Subjects
                              </Button>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6">
                          BTech 2023-2027 Students
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button 
                            variant="outlined" 
                            size="small"
                            startIcon={<Refresh />}
                            onClick={() => fetchStudents(selectedBatch)}
                            disabled={studentsLoading}
                          >
                            Refresh
                          </Button>
                          <Button 
                            variant="outlined" 
                            size="small"
                            startIcon={<Add />}
                            onClick={handleAddStudent}
                          >
                            Add Student
                          </Button>
                        </Box>
                      </Box>
                      
                      {studentsLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <TableContainer component={Paper} variant="outlined">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Section</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {students.map((student) => (
                                <TableRow key={student.id}>
                                  <TableCell>{student.id}</TableCell>
                                  <TableCell>{student.name}</TableCell>
                                  <TableCell>{student.section}</TableCell>
                                  <TableCell>{student.email || '-'}</TableCell>
                                  <TableCell align="right">
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                      <Button 
                                        size="small" 
                                        variant="outlined"
                                        startIcon={<EditIcon />}
                                        onClick={() => handleEditStudent(student)}
                                      >
                                        Edit
                                      </Button>
                                      <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={() => handleDeleteConfirm(student)}
                                      >
                                        Delete
                                      </Button>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {students.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                      No students found in this batch
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Student Form Dialog */}
      <StudentForm
        open={studentFormOpen}
        onClose={() => setStudentFormOpen(false)}
        onSave={handleSaveStudent}
        student={editingStudent}
        title={editingStudent ? "Edit Student" : "Add New Student"}
        saving={savingStudent}
        error={studentError}
        selectedBatch={selectedBatch}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete student {studentToDelete?.name} ({studentToDelete?.id})? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteStudent} 
            color="error" 
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPortal;