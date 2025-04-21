import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { Student } from '../types/university';
import { BATCHES } from '../data/universityData';

interface StudentFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  student?: Student;
  title: string;
  saving?: boolean;
  error?: string;
  selectedBatch?: string;
}

const StudentForm: React.FC<StudentFormProps> = ({
  open,
  onClose,
  onSave,
  student,
  title,
  saving = false,
  error,
  selectedBatch = '2023-2027'
}) => {
  const [form, setForm] = useState<Student>({
    id: '',
    name: '',
    section: 'CSE-1',
    email: '',
    batch: selectedBatch
  });

  useEffect(() => {
    if (student) {
      setForm(student);
    } else {
      setForm({
        id: '',
        name: '',
        section: 'CSE-1',
        email: '',
        batch: selectedBatch
      });
    }
  }, [student, open, selectedBatch]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Student ID"
            name="id"
            value={form.id}
            onChange={handleTextChange}
            fullWidth
            variant="outlined"
            required
            disabled={!!student}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Full Name"
            name="name"
            value={form.name}
            onChange={handleTextChange}
            fullWidth
            variant="outlined"
            required
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Section</InputLabel>
            <Select
              name="section"
              value={form.section}
              label="Section"
              onChange={handleSelectChange}
              required
            >
              <MenuItem value="CSE-1">CSE-1</MenuItem>
              <MenuItem value="CSE-2">CSE-2</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Batch</InputLabel>
            <Select
              name="batch"
              value={form.batch}
              label="Batch"
              onChange={handleSelectChange}
              required
            >
              {BATCHES.map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>
                  {batch.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Email Address"
            name="email"
            value={form.email || ''}
            onChange={handleTextChange}
            fullWidth
            variant="outlined"
            type="email"
            sx={{ mb: 2 }}
          />

          {error && (
            <Box mt={2}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StudentForm; 