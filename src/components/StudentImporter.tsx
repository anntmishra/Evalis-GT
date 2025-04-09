import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { CloudUpload, Save, Cancel } from '@mui/icons-material';
import { read, utils } from 'xlsx';
import { Student } from '../types/university';

interface StudentImporterProps {
  batches: { id: string; name: string }[];
  onImportStudents: (batchId: string, students: Student[]) => void;
}

const StudentImporter: React.FC<StudentImporterProps> = ({ batches, onImportStudents }) => {
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [importedStudents, setImportedStudents] = useState<Student[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBatch) return;

    setIsUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json<any>(worksheet);

      // Map Excel data to student format
      const students: Student[] = jsonData.map((row: any, index: number) => ({
        id: row.StudentID || row.Id || `S${String(index).padStart(3, '0')}`,
        name: row.Name || `${row.FirstName || ''} ${row.LastName || ''}`.trim(),
        section: row.Section || selectedBatch.split('-')[0] || 'CSE-1'
      }));

      setImportedStudents(students);
      setShowPreview(true);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      setNotification({
        open: true,
        message: "Failed to process Excel file. Check format and try again.",
        severity: "error"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const confirmImport = () => {
    if (importedStudents.length === 0) {
      setNotification({
        open: true,
        message: "No students to import",
        severity: "error"
      });
      return;
    }

    onImportStudents(selectedBatch, importedStudents);
    setShowPreview(false);
    setNotification({
      open: true,
      message: `Successfully imported ${importedStudents.length} students to batch ${selectedBatch}`,
      severity: "success"
    });
    setImportedStudents([]);
  };

  return (
    <Box>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Import Students from Excel
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Upload an Excel file containing student data. The file should have columns for student ID, name, and section.
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Batch</InputLabel>
                <Select
                  value={selectedBatch}
                  label="Select Batch"
                  onChange={(e) => setSelectedBatch(e.target.value)}
                >
                  {batches.map((batch) => (
                    <MenuItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUpload />}
                disabled={!selectedBatch || isUploading}
                sx={{ mb: 2 }}
                fullWidth
              >
                {isUploading ? "Processing..." : "Upload Excel File"}
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={!selectedBatch || isUploading}
                />
              </Button>

              {isUploading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress />
                </Box>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Excel Format Instructions:
                </Typography>
                <Typography variant="body2" component="div">
                  <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                    <Box component="li" sx={{ mb: 1 }}>
                      First row should contain column headers
                    </Box>
                    <Box component="li" sx={{ mb: 1 }}>
                      Required columns: StudentID (or Id), Name (or FirstName & LastName), Section
                    </Box>
                    <Box component="li" sx={{ mb: 1 }}>
                      If Section is missing, the selected batch's default section will be used
                    </Box>
                  </Box>
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Student Import Preview Dialog */}
      <Dialog open={showPreview} maxWidth="md" fullWidth>
        <DialogTitle>Review Students to Import</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom>
            Importing {importedStudents.length} students to batch {selectedBatch}
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Section</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importedStudents.slice(0, 10).map((student, index) => (
                  <TableRow key={index}>
                    <TableCell>{student.id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.section}</TableCell>
                  </TableRow>
                ))}
                {importedStudents.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      ... and {importedStudents.length - 10} more students
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<Cancel />} onClick={() => setShowPreview(false)}>Cancel</Button>
          <Button startIcon={<Save />} variant="contained" color="primary" onClick={confirmImport}>
            Confirm Import
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
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentImporter; 