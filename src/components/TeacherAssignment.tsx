import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add, Edit, Save, Cancel, Delete } from '@mui/icons-material';
import { Teacher, Subject } from '../types/university';

interface TeacherAssignmentProps {
  teachers: Teacher[];
  subjects: Subject[];
  onAssignSubject: (teacherId: string, subjectId: string) => void;
  onRemoveSubject: (teacherId: string, subjectId: string) => void;
  onAddTeacher: (teacher: Teacher) => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher?: (teacherId: string) => void;
}

const TeacherAssignment: React.FC<TeacherAssignmentProps> = ({
  teachers,
  subjects,
  onAssignSubject,
  onRemoveSubject,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher
}) => {
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [newTeacher, setNewTeacher] = useState<Teacher>({ id: '', name: '', email: '', subjects: [] });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedTeacher || !selectedSubject) {
      setNotification({
        open: true,
        message: 'Please select both a teacher and a subject',
        severity: 'error'
      });
      return;
    }

    // Check if teacher already has this subject
    const teacher = teachers.find(t => t.id === selectedTeacher);
    if (teacher && teacher.subjects.includes(selectedSubject)) {
      setNotification({
        open: true,
        message: 'This teacher already has this subject assigned',
        severity: 'error'
      });
      return;
    }

    setIsAssigning(true);
    
    try {
      await onAssignSubject(selectedTeacher, selectedSubject);
      
      // Reset selections
      setSelectedSubject('');
    } catch (error) {
      console.error("Error in handleAssign:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveSubject = (teacherId: string, subjectId: string) => {
    onRemoveSubject(teacherId, subjectId);
  };

  const handleAddTeacher = () => {
    if (!newTeacher.id || !newTeacher.name || !newTeacher.email) {
      setNotification({
        open: true,
        message: 'Please fill all required fields',
        severity: 'error'
      });
      return;
    }

    // Check if teacher ID already exists
    if (teachers.some(t => t.id === newTeacher.id) && !editingTeacher) {
      setNotification({
        open: true,
        message: 'Teacher ID already exists',
        severity: 'error'
      });
      return;
    }

    if (editingTeacher) {
      onEditTeacher(newTeacher);
    } else {
      onAddTeacher({ ...newTeacher, subjects: [] });
    }

    // Reset form and close dialog
    setNewTeacher({ id: '', name: '', email: '', subjects: [] });
    setEditingTeacher(null);
    setOpenDialog(false);
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setNewTeacher({ ...teacher });
    setOpenDialog(true);
  };

  const openDeleteDialog = (teacherId: string) => {
    setTeacherToDelete(teacherId);
    setDeleteConfirmDialog(true);
  };

  const handleDeleteTeacher = () => {
    if (onDeleteTeacher && teacherToDelete) {
      onDeleteTeacher(teacherToDelete);
      setDeleteConfirmDialog(false);
      setTeacherToDelete('');
    }
  };

  const getSubjectName = (subjectId: string): string => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
  };

  const getTeacherName = (teacherId: string): string => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : teacherId;
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assign Subjects to Teachers
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Teacher</InputLabel>
                <Select
                  value={selectedTeacher}
                  label="Select Teacher"
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  disabled={isAssigning}
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Subject</InputLabel>
                <Select
                  value={selectedSubject}
                  label="Select Subject"
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={!selectedTeacher || isAssigning}
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleAssign}
                disabled={!selectedTeacher || !selectedSubject || isAssigning}
                startIcon={isAssigning ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isAssigning ? "Assigning..." : "Assign Subject"}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Teacher Management
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => {
                    setEditingTeacher(null);
                    setNewTeacher({ id: '', name: '', email: '', subjects: [] });
                    setOpenDialog(true);
                  }}
                >
                  Add Teacher
                </Button>
              </Box>

              <Typography variant="body2" color="text.secondary" paragraph>
                Add new teachers or edit existing teacher information.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Assigned Subjects</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>{teacher.id}</TableCell>
                    <TableCell>{teacher.name}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>
                      {teacher.subjects.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {teacher.subjects.map((subjectId) => (
                            <Chip
                              key={subjectId}
                              label={getSubjectName(subjectId)}
                              size="small"
                              onDelete={() => handleRemoveSubject(teacher.id, subjectId)}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No subjects assigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Edit Teacher">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEditDialog(teacher)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {onDeleteTeacher && (
                          <Tooltip title="Delete Teacher">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openDeleteDialog(teacher.id)}
                              sx={{ ml: 1 }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}

                {teachers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No teachers found. Add a teacher to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* Add/Edit Teacher Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Teacher ID"
            fullWidth
            variant="outlined"
            value={newTeacher.id}
            onChange={(e) => setNewTeacher({ ...newTeacher, id: e.target.value })}
            disabled={!!editingTeacher}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Full Name"
            fullWidth
            variant="outlined"
            value={newTeacher.name}
            onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            sx={{ mb: 2 }}
            label="Email Address"
            fullWidth
            variant="outlined"
            value={newTeacher.email}
            onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
            type="email"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} startIcon={<Cancel />}>Cancel</Button>
          <Button onClick={handleAddTeacher} color="primary" variant="contained" startIcon={<Save />}>
            {editingTeacher ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog}
        onClose={() => setDeleteConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete teacher: <strong>{getTeacherName(teacherToDelete)}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This action cannot be undone. All associated data including subject assignments will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog(false)} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button onClick={handleDeleteTeacher} color="error" variant="contained" startIcon={<Delete />}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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

export default TeacherAssignment; 