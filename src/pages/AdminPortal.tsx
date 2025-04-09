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
} from "@mui/material";
import {
  SupervisorAccount,
  School,
  CloudUpload,
  Group,
} from "@mui/icons-material";
import Header from "../components/Header";
import { useNavigate } from "react-router-dom";
import {
  STUDENTS,
  SUBJECTS,
  BATCHES,
} from "../data/universityData";
import { Student, Subject, Teacher } from "../types/university";
import TeacherAssignment from "../components/TeacherAssignment";
import StudentImporter from "../components/StudentImporter";

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

// Mock data for teachers - this would come from your actual API/database
const TEACHERS: Teacher[] = [
  { id: "T001", name: "Dr. Smith", email: "smith@university.edu", subjects: ["CSE101", "CSE102"] },
  { id: "T002", name: "Dr. Johnson", email: "johnson@university.edu", subjects: ["CSE201"] },
  { id: "T003", name: "Prof. Williams", email: "williams@university.edu", subjects: ["CSE203", "CSE204"] },
  { id: "T004", name: "Dr. Brown", email: "brown@university.edu", subjects: ["CSE103"] },
];

const AdminPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [notification, setNotification] = useState({ 
    open: false, 
    message: "", 
    severity: "success" as "success" | "error" 
  });
  const [teachers, setTeachers] = useState<Teacher[]>(TEACHERS);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated as admin
    const userDataStr = localStorage.getItem("currentUser");
    if (!userDataStr) {
      navigate("/login");
      return;
    }

    try {
      const userData = JSON.parse(userDataStr);
      if (userData.role !== "admin") {
        navigate("/login");
      }
    } catch (error) {
      navigate("/login");
    }
  }, [navigate]);

  // Get all subjects across all sections
  const getAllSubjects = (): Subject[] => {
    return Object.values(SUBJECTS).flat();
  };

  // Handle teacher subject assignment
  const handleAssignSubject = (teacherId: string, subjectId: string) => {
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
  };

  // Handle teacher subject removal
  const handleRemoveSubject = (teacherId: string, subjectId: string) => {
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
  };

  // Handle adding a new teacher
  const handleAddTeacher = (teacher: Teacher) => {
    setTeachers(prevTeachers => [...prevTeachers, teacher]);
  };

  // Handle editing an existing teacher
  const handleEditTeacher = (updatedTeacher: Teacher) => {
    setTeachers(prevTeachers => {
      return prevTeachers.map(teacher => {
        if (teacher.id === updatedTeacher.id) {
          return updatedTeacher;
        }
        return teacher;
      });
    });
  };

  // Handle importing students
  const handleImportStudents = (batchId: string, students: Student[]) => {
    // In a real application, this would call an API to save the students
    console.log(`Importing ${students.length} students to batch ${batchId}:`, students);
    setNotification({
      open: true,
      message: `Successfully imported ${students.length} students to batch ${batchId}`,
      severity: "success"
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
                  <Tab icon={<CloudUpload />} label="Student Import" />
                  <Tab icon={<Group />} label="Data Management" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                  <TeacherAssignment 
                    teachers={teachers}
                    subjects={getAllSubjects()}
                    onAssignSubject={handleAssignSubject}
                    onRemoveSubject={handleRemoveSubject}
                    onAddTeacher={handleAddTeacher}
                    onEditTeacher={handleEditTeacher}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <StudentImporter 
                    batches={BATCHES}
                    onImportStudents={handleImportStudents}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Batch Overview
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                              {BATCHES.map((batch) => (
                                <Box component="li" key={batch.id} sx={{ mb: 1 }}>
                                  <Typography variant="body1">
                                    <strong>{batch.name}</strong> ({batch.id}): {STUDENTS[batch.id]?.length || 0} students
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
                          <Typography variant="h6" gutterBottom>
                            Subject Overview
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            {Object.entries(SUBJECTS).map(([section, subjectList]) => (
                              <Box key={section} sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                  Section: {section}
                                </Typography>
                                <Box component="ul" sx={{ pl: 2 }}>
                                  {subjectList.map((subject) => (
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
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Notifications */}
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