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
  Edit as EditIcon,
  Book as BookIcon,
  Timeline as TimelineIcon,
  Class as ClassIcon
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
import SubjectForm from "../components/SubjectForm";
import BatchList from "../components/BatchList";
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
import { seedBatches, getAllBatches } from "../api/batchService";
// @ts-ignore
import config from "../config/environment";
import SemesterManagement from '../components/SemesterManagement';

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
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [seedingSubjects, setSeedingSubjects] = useState(false);
  const [seedingBatches, setSeedingBatches] = useState(false);
  
  // Student data state
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentError, setStudentError] = useState<string | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  // Subject data state
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectError, setSubjectError] = useState<string | undefined>(undefined);

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
        setSubjectsLoading(true);
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
        setSubjectsLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  // Fetch subjects from API
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Fetch batches and initialize selected batch
  useEffect(() => {
    fetchBatches();
  }, []);

  // Fetch students when a batch is selected
  useEffect(() => {
    if (selectedBatchId) {
      fetchStudents(selectedBatchId);
    }
  }, [selectedBatchId]);

  // Function to fetch batches
  const fetchBatches = async () => {
    try {
      const response = await getAllBatches();
      setAvailableBatches(response);
      console.log("Batches loaded from API:", response);
      
      // Auto-select first batch if available
      if (response && response.length > 0) {
        setSelectedBatchId(response[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching batches:", error);
      handleApiError(error, "Failed to load batches. Please try again.");
    }
  };

  // Function to fetch students
  const fetchStudents = async (batchId: string) => {
    setStudentsLoading(true);
    try {
      let response;
      if (batchId) {
        response = await getStudentsByBatch(batchId);
        // API returns array directly for batch students
        setStudents(Array.isArray(response) ? response : 
                   (response.students ? response.students : []));
      } else {
        response = await getAllStudents();
        // getAllStudents may return either {students: []} or the array directly
        setStudents(Array.isArray(response) ? response : 
                   (response.students ? response.students : []));
      }
      console.log("Students loaded from API:", response);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      // Use the improved error handler
      handleApiError(error, "Failed to load students. Please try again.");
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
    
    // Extract error message with more detail
    let errorMessage = defaultMessage;
    
    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      const serverMessage = error.response.data?.message || JSON.stringify(error.response.data);
      
      console.error(`Server error (${status}):`, serverMessage);
      
      if (status === 401 || status === 403) {
        errorMessage = "Authentication error. Please log in again.";
        // Optional: redirect to login
        setTimeout(() => navigate('/login'), 3000);
      } else if (status === 404) {
        errorMessage = `Not found: ${serverMessage}`;
      } else if (status >= 500) {
        errorMessage = `Server error (${status}): ${serverMessage}`;
      } else {
        errorMessage = `Error (${status}): ${serverMessage}`;
      }
    } else if (error.request) {
      // No response received
      console.error("No response from server:", error.request);
      errorMessage = "Network error. Please check your connection and make sure the backend server is running.";
    } else {
      // Something else happened
      errorMessage = error.message || defaultMessage;
    }
    
    console.log(`Displaying error notification: ${errorMessage}`);
    
    setNotification({
      open: true,
      message: errorMessage,
      severity: "error"
    });
    
    return errorMessage;
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
      
      // Show a success message with password info if available
      if (response.initialPassword) {
        const passwordInfo = `Initial password: ${response.initialPassword}`;
        const emailInfo = response.email ? "A password reset link has been sent to the teacher's email." : "";
        
        setNotification({
          open: true,
          message: `Teacher ${response.name} added successfully. ${passwordInfo} ${emailInfo}`,
          severity: "success"
        });
      } else {
        setNotification({
          open: true,
          message: "Teacher added successfully",
          severity: "success"
        });
      }
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
    if (batchId === selectedBatchId) {
      fetchStudents(selectedBatchId);
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
    try {
      setSavingStudent(true);
      setStudentError(undefined);
      
      if (editingStudent) {
        // Updating existing student
        await updateStudent(student.id, student);
        await fetchStudents(selectedBatchId);
        
        setNotification({
          open: true,
          message: `Student ${student.name} updated successfully`,
          severity: "success"
        });
      } else {
        // Creating new student
        if (!student.id) {
          setStudentError("Student ID is required");
          setSavingStudent(false);
          return;
        }
        
        // Set password equal to student ID if not provided
        const studentWithPassword = {
          ...student,
          password: student.initialPassword || student.id // Use generated password or default to student ID
        };
        
        console.log('Submitting student with data:', studentWithPassword);
        await createStudent(studentWithPassword);
        
        // Automatically send password reset email if email is provided
        if (student.email) {
          try {
            // Import here to avoid circular dependencies
            const { sendPasswordReset } = await import('../config/firebase');
            const resetResult = await sendPasswordReset(student.email);
            
            if (resetResult.success) {
              console.log(`Password reset email sent to ${student.email}`);
            } else {
              console.error(`Failed to send password reset email: ${resetResult.message}`);
            }
          } catch (resetError) {
            console.error('Error sending password reset email:', resetError);
            // Don't fail the whole operation if password reset fails
          }
        }
        
        // Fetch updated students list to ensure we have the latest data
        await fetchStudents(selectedBatchId);
        
        // Show success notification with password info if available
        const passwordInfo = student.initialPassword 
          ? `Initial password: ${student.initialPassword}`
          : `Default password: ${student.id}`;
          
        const resetInfo = student.email 
          ? "A password reset link has been sent to the student's email." 
          : "";
        
        setNotification({
          open: true,
          message: `Student ${student.name} added successfully. ${passwordInfo} ${resetInfo}`,
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
  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    try {
      await deleteStudent(studentToDelete.id);
      
      // Fetch updated students list
      await fetchStudents(selectedBatchId);
      
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

  // Handle creating a new subject
  const handleAddSubject = () => {
    setSubjectFormOpen(true);
  };
  
  // Handle saving a subject
  const handleSaveSubject = async (subjectData: Partial<Subject>) => {
    try {
      setSavingSubject(true);
      setSubjectError(undefined);
      
      await createSubject(subjectData);
      
      // Refresh the subject list
      fetchSubjects();
      
      // Close the form and show success notification
      setSubjectFormOpen(false);
      setNotification({
        open: true,
        message: "Subject created successfully!",
        severity: "success"
      });
    } catch (error: any) {
      console.error("Error creating subject:", error);
      setSubjectError(error.response?.data?.message || "Failed to create subject. Please try again.");
    } finally {
      setSavingSubject(false);
    }
  };

  // Custom notification handlers for semester management
  const handleSemesterSuccess = (message: string) => {
    setNotification({
      open: true,
      message,
      severity: "success"
    });
  };
  
  const handleSemesterError = (message: string) => {
    setNotification({
      open: true,
      message,
      severity: "error"
    });
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
                  <Tab icon={<BookIcon />} label="Subjects" />
                  <Tab icon={<ClassIcon />} label="Batches" />
                  <Tab icon={<TimelineIcon />} label="Semesters" />
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
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Students {students.length > 0 ? `(${students.length})` : ''}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                          variant="outlined" 
                          startIcon={<Refresh />}
                          onClick={() => fetchStudents(selectedBatchId)}
                          disabled={studentsLoading}
                        >
                          Refresh
                        </Button>
                        <Button 
                          variant="contained" 
                          startIcon={<Add />}
                          onClick={handleAddStudent}
                          disabled={studentsLoading}
                        >
                          Add Student
                        </Button>
                      </Box>
                    </Box>
                    
                    {/* Batch Selector */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Select Batch:
                      </Typography>
                      <select 
                        value={selectedBatchId} 
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: '14px', 
                          border: '1px solid #ccc', 
                          borderRadius: '4px',
                          minWidth: '200px'
                        }}
                      >
                        <option value="">Select a batch...</option>
                        {availableBatches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name} ({batch.id})
                          </option>
                        ))}
                      </select>
                    </Box>
                  </Box>
                  
                  {studentsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : students.length > 0 ? (
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
                              <TableCell>{student.email}</TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                  <Button
                                    size="small"
                                    startIcon={<EditIcon />}
                                    onClick={() => handleEditStudent(student)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="small"
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
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No students found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        There are no students in the selected batch or the database hasn't been initialized.
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
                        <Button 
                          variant="outlined" 
                          onClick={() => fetchStudents(selectedBatchId)}
                          startIcon={<Refresh />}
                        >
                          Retry Loading
                        </Button>
                        <Button 
                          variant="contained" 
                          onClick={handleAddStudent}
                          startIcon={<Add />}
                        >
                          Add First Student
                        </Button>
                      </Box>
                    </Paper>
                  )}
                </TabPanel>

                <TabPanel value={tabValue} index={5}>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                      Subjects {subjects.length > 0 ? `(${subjects.length})` : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button 
                        variant="outlined" 
                        startIcon={<Refresh />}
                        onClick={fetchSubjects}
                        disabled={subjectsLoading}
                      >
                        Refresh
                      </Button>
                      <Button 
                        variant="contained" 
                        startIcon={<Add />}
                        onClick={handleAddSubject}
                        disabled={subjectsLoading}
                      >
                        Add Subject
                      </Button>
                    </Box>
                  </Box>
                  
                  {subjectsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : subjects.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Section</TableCell>
                            <TableCell>Credits</TableCell>
                            <TableCell>Semester</TableCell>
                            <TableCell>Batch</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {subjects.map((subject) => (
                            <TableRow key={subject.id}>
                              <TableCell>{subject.id}</TableCell>
                              <TableCell>{subject.name}</TableCell>
                              <TableCell>{subject.section}</TableCell>
                              <TableCell>{subject.credits}</TableCell>
                              <TableCell>
                                {subject.Semester?.name || 'Not assigned'}
                              </TableCell>
                              <TableCell>
                                {subject.Batch?.name || subject.batchId || 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', my: 4 }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No subjects found
                      </Typography>
                      <Typography color="text.secondary" paragraph>
                        Click "Add Subject" to create your first subject.
                      </Typography>
                    </Box>
                  )}
                </TabPanel>

                <TabPanel value={tabValue} index={6}>
                  <BatchList onBatchChange={fetchBatches} />
                </TabPanel>

                <TabPanel value={tabValue} index={7}>
                  <SemesterManagement 
                    onSuccess={handleSemesterSuccess}
                    onError={handleSemesterError}
                  />
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Student Form Dialog */}
      <StudentForm
        open={studentFormOpen}
        onClose={() => {
          setStudentFormOpen(false);
          setEditingStudent(undefined);
          setStudentError(undefined);
        }}
        onSave={handleSaveStudent}
        student={editingStudent}
        title={editingStudent ? "Edit Student" : "Add Student"}
        saving={savingStudent}
        error={studentError}
        selectedBatch={selectedBatchId}
        availableBatches={availableBatches}
      />

      {/* Subject Form Dialog */}
      <SubjectForm
        open={subjectFormOpen}
        onClose={() => {
          setSubjectFormOpen(false);
          setSubjectError(undefined);
        }}
        onSave={handleSaveSubject}
        title="Create New Subject"
        saving={savingSubject}
        error={subjectError}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete student {studentToDelete?.name} ({studentToDelete?.id})? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDeleteStudent} 
            color="error" 
            variant="contained"
            disabled={savingStudent}
          >
            {savingStudent ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.severity}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPortal;