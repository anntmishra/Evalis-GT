import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { Save, InsertPhoto, AttachFile } from '@mui/icons-material';
import { useAuth } from '@clerk/clerk-react';
import config from '../config/environment';

interface Subject {
  id: string;
  name: string;
}

interface ExamType {
  id: string;
  name: string;
}

interface TeacherAssignmentCreatorProps {
  subjects: Subject[];
  examTypes: ExamType[];
  onAssignmentCreated?: () => void;
}

const TeacherAssignmentCreator: React.FC<TeacherAssignmentCreatorProps> = ({
  subjects,
  examTypes,
  onAssignmentCreated
}) => {
  const { getToken } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreview(event.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !subjectId || !examType) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('subjectId', subjectId);
      formData.append('examType', examType);
      if (dueDate) formData.append('dueDate', dueDate);
      if (file) formData.append('file', file);

      console.log('FormData contents:');
      console.log('- title:', title);
      console.log('- subjectId:', subjectId);
      console.log('- examType:', examType);
      console.log('- dueDate:', dueDate || 'not set');
      console.log('- file:', file ? file.name : 'not attached');

      try {
        // Ensure we have a fresh token before making the request
        // This fixes the issue where the token in localStorage might be expired
        const token = await getToken();
        if (token) {
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, token);
        }

        // Use the centralized API for file upload which handles auth tokens automatically
        const api = await import('../api');

        if (file) {
          console.log('Uploading with FormData via API client');
          await api.uploadAssignment(formData);
        } else {
          // Standard API call without file
          console.log('Creating assignment without file via API client');
          await api.createAssignment({
            title,
            description,
            subjectId,
            examType,
            dueDate: dueDate || null,
          });
        }

        console.log('Assignment created successfully');
      } catch (apiError: any) {
        console.error('Error in assignment creation:', apiError);
        throw apiError;
      }

      setSuccess(true);

      // Reset form
      setTitle('');
      setDescription('');
      setSubjectId('');
      setExamType('');
      setDueDate('');
      setFile(null);
      setFilePreview(null);

      // Notify parent component
      if (onAssignmentCreated) {
        onAssignmentCreated();
      }

      // Clear success message after a delay
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Create New Assignment
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Assignment created successfully!
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Assignment Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                required
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Subject</InputLabel>
                <Select
                  value={subjectId}
                  label="Subject"
                  onChange={(e: SelectChangeEvent) => setSubjectId(e.target.value)}
                  disabled={loading}
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Assignment Type</InputLabel>
                <Select
                  value={examType}
                  label="Assignment Type"
                  onChange={(e: SelectChangeEvent) => setExamType(e.target.value)}
                  disabled={loading}
                >
                  {examTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Due Date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={4}
                disabled={loading}
                placeholder="Provide detailed instructions for the assignment..."
              />
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  border: '1px dashed #ccc',
                  borderRadius: 1,
                  p: 3,
                  textAlign: 'center',
                  mb: 2,
                  bgcolor: 'background.paper'
                }}
              >
                <input
                  accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx"
                  style={{ display: 'none' }}
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <label htmlFor="file-upload">
                  <Button
                    component="span"
                    variant="outlined"
                    startIcon={<AttachFile />}
                    disabled={loading}
                    sx={{ mb: 2 }}
                  >
                    {file ? 'Change File' : 'Upload Assignment File or Image'}
                  </Button>
                </label>

                {file && (
                  <Box sx={{ mt: 2, textAlign: 'left' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Selected File:
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {file.type.startsWith('image/') ? <InsertPhoto sx={{ mr: 1 }} /> : <AttachFile sx={{ mr: 1 }} />}
                      <Typography variant="body2">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </Typography>
                    </Box>
                  </Box>
                )}

                {filePreview && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Preview:
                    </Typography>
                    <Box
                      component="img"
                      src={filePreview}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        objectFit: 'contain',
                        border: '1px solid #eee',
                        borderRadius: 1
                      }}
                      alt="File preview"
                    />
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                disabled={loading || !title || !subjectId || !examType}
                fullWidth
              >
                {loading ? 'Creating...' : 'Create Assignment'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

export default TeacherAssignmentCreator; 