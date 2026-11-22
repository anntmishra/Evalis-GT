import React, { useEffect, useState } from 'react';
import axios from 'axios';
import config from '../../config/environment';
import { getAuthConfig } from '../../api/authUtils';
import { getAllBatches } from '../../api/batchService';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Download, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import ManualAccountPanel from './ManualAccountPanel';

interface ImportResult {
  message?: string;
  totalImported?: number;
  created?: number;
  updated?: number;
  roleGrantsSeeded?: number;
  invitationsSent?: number;
  invitationErrors?: string[];
  studentsCreated?: number;
  studentsUpdated?: number;
  teachersCreated?: number;
  teachersUpdated?: number;
  assignmentsCreated?: number;
  assignmentsExisting?: number;
  schoolsCreated?: number;
  schoolsUpdated?: number;
  departmentsCreated?: number;
  departmentsUpdated?: number;
  programmesCreated?: number;
  programmesUpdated?: number;
  batchesCreated?: number;
  batchesUpdated?: number;
  semestersCreated?: number;
  semestersUpdated?: number;
  subjectsCreated?: number;
  subjectsUpdated?: number;
  validationOnly?: boolean;
  rolledBack?: boolean;
  errors?: string[];
}

interface Batch {
  id: string;
  name: string;
}

// Real multipart Excel/CSV upload against the hierarchy-aware academic import endpoint.
// Shared between the Master Admin and COE screens so validation and upload behavior live
// in one place.
export const BulkImportPanel: React.FC = () => {
  const [importType, setImportType] = useState<'academic' | 'students' | 'teachers'>('academic');
  const [file, setFile] = useState<File | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (importType !== 'students') return;
    getAllBatches()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.batches || [];
        setBatches(list);
        if (list.length > 0) setBatchId((prev) => prev || list[0].id);
      })
      .catch((err) => console.error('Failed to load batches for import:', err));
  }, [importType]);

  const resetForFile = (f: File | null) => {
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetForFile(e.target.files?.[0] || null);
  };

  const handleUpload = async (validateOnly = false) => {
    if (!file) return;
    if (importType === 'students' && !batchId) {
      setError('Please select a default batch for this import.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', importType);
      formData.append('validateOnly', String(validateOnly));
      if (importType === 'students') {
        formData.append('batchId', batchId);
      }

      const endpoint = `${config.API_BASE_URL}/admin-tools/import-academic`;
      const authConfig = await getAuthConfig();

      // Deliberately don't set Content-Type here: axios/the browser must compute the
      // multipart boundary itself for a FormData body. Setting 'multipart/form-data'
      // manually (no boundary) breaks the server's multer parser.
      const response = await axios.post(endpoint, formData, {
        headers: { Authorization: authConfig.headers.Authorization }
      });

      setResult(response.data);
      if (!validateOnly) {
        setFile(null);
        const fileInput = document.getElementById('bulk-import-file') as HTMLInputElement | null;
        if (fileInput) fileInput.value = '';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const batch = 'BTECH-CSE-2026-2030';
    if (importType === 'academic') {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ School_Code: 'SOET', Name: 'School of Engineering and Technology', Description: 'Engineering school', Active: true }]), 'Schools');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Department_Code: 'CSE', Name: 'Computer Science and Engineering', School_Code: 'SOET', Description: 'CSE department', Active: true }]), 'Departments');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Programme_Code: 'BTECH-CSE', Name: 'B.Tech Computer Science and Engineering', School_Code: 'SOET', Department_Code: 'CSE', Description: 'Four-year undergraduate programme', Active: true }]), 'Programmes');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Batch_ID: batch, Name: 'BTECH CSE 2026-30', Programme_Code: 'BTECH-CSE', Department: 'Computer Science and Engineering', Start_Year: 2026, Duration_Years: 4, Semesters_Per_Year: 2, Active: true }]), 'Batches');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(Array.from({ length: 8 }, (_, index) => ({ Semester_ID: `${batch}-SEM${index + 1}`, Batch_ID: batch, Number: index + 1, Name: `Semester ${index + 1}`, Start_Date: `${2026 + Math.floor(index / 2)}-${index % 2 ? '01-15' : '08-01'}`, End_Date: `${2026 + Math.floor(index / 2)}-${index % 2 ? '05-30' : '12-15'}`, Active: index === 0 }))), 'Semesters');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Subject_ID: 'CSET111-26', Name: 'Computer Networks', Batch_ID: batch, Semester_ID: `${batch}-SEM1`, Section: 'CSE-A', Credits: 4, Type: 'Core', Description: '' }, { Subject_ID: 'CSET221-26', Name: 'Database Management System', Batch_ID: batch, Semester_ID: `${batch}-SEM1`, Section: 'CSE-A', Credits: 7, Type: 'Core', Description: '' }, { Subject_ID: 'CSET202-26', Name: 'Operating System', Batch_ID: batch, Semester_ID: `${batch}-SEM1`, Section: 'CSE-A', Credits: 4, Type: 'Core', Description: '' }]), 'Subjects');
    }
    const students = XLSX.utils.json_to_sheet([{ Student_ID: 'S260001', Name: 'Jane Doe', Email: 'jane.doe@example.edu', Batch_ID: batch, Section: 'CSE-A' }]);
    const teachers = XLSX.utils.json_to_sheet([{ Teacher_ID: 'T260001', Name: 'Dr. A. Sharma', Email: 'a.sharma@example.edu', Qualification: 'PhD', Designation: 'Assistant Professor' }]);
    const assignments = XLSX.utils.json_to_sheet([{ Teacher_ID: 'T260001', Subject_ID: 'CSET111-26', Section: 'CSE-A', Session_Type: 'lecture', Capacity: 60 }]);
    if (importType !== 'teachers') XLSX.utils.book_append_sheet(workbook, students, 'Students');
    if (importType !== 'students') XLSX.utils.book_append_sheet(workbook, teachers, 'Teachers');
    if (importType === 'academic') XLSX.utils.book_append_sheet(workbook, assignments, 'Teaching Assignments');
    XLSX.writeFile(workbook, `${importType}_import_template.xlsx`);
  };

  const createdCount = result?.created ?? ((result?.schoolsCreated || 0) + (result?.departmentsCreated || 0) + (result?.programmesCreated || 0) + (result?.batchesCreated || 0) + (result?.semestersCreated || 0) + (result?.subjectsCreated || 0) + (result?.studentsCreated || 0) + (result?.teachersCreated || 0) + (result?.assignmentsCreated || 0));
  const updatedCount = result?.updated ?? ((result?.schoolsUpdated || 0) + (result?.departmentsUpdated || 0) + (result?.programmesUpdated || 0) + (result?.batchesUpdated || 0) + (result?.semestersUpdated || 0) + (result?.subjectsUpdated || 0) + (result?.studentsUpdated || 0) + (result?.teachersUpdated || 0));

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <PremiumCard title="Bulk Data Import" subtitle="Upload an Excel (.xlsx, .xls) file to provision accounts.">
        <div className="space-y-6 mt-4">
          <div className="flex gap-4 p-1 bg-secondary rounded-lg">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${importType === 'academic' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background'}`}
              onClick={() => { setImportType('academic'); resetForFile(null); }}
            >
              Full Setup
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${importType === 'students' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background'}`}
              onClick={() => { setImportType('students'); resetForFile(null); }}
            >
              Import Students
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${importType === 'teachers' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-background'}`}
              onClick={() => { setImportType('teachers'); resetForFile(null); }}
            >
              Import Teachers
            </button>
          </div>

          {importType === 'students' && (
            <div>
              <label className="block text-sm font-medium mb-1">Default Batch</label>
              <select
                className="w-full p-2 border rounded-lg bg-background"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={isUploading}
              >
                {batches.length === 0 && <option value="">No batches found -- create one first</option>}
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Applied to every row unless the sheet has its own Batch column.
              </p>
            </div>
          )}

          <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-secondary/10 hover:bg-secondary/20 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              id="bulk-import-file"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <label htmlFor="bulk-import-file" className="cursor-pointer flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Upload size={28} />
              </div>
              <h3 className="font-serif text-lg font-bold mb-1">
                {file ? file.name : 'Select Excel File'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {file ? `${(file.size / 1024).toFixed(2)} KB` : '.xlsx or .xls -- click to browse'}
              </p>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="outline" className="flex-1" onClick={downloadTemplate}>
              <Download size={16} className="mr-2" /> Download Template
            </Button>
            <Button
              variant="outline"
              disabled={!file || isUploading || (importType === 'students' && !batchId)}
              onClick={() => handleUpload(true)}
            >
              <ShieldCheck size={16} className="mr-2" /> Validate Only
            </Button>
            <Button
              className="flex-1"
              disabled={!file || isUploading || (importType === 'students' && !batchId)}
              onClick={() => handleUpload(false)}
            >
              {isUploading ? 'Processing...' : 'Upload & Import'}
            </Button>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
          )}
        </div>
      </PremiumCard>

      <div className="space-y-6">
        {result && (
          <PremiumCard className={result.errors && result.errors.length > 0 ? 'border-amber-500' : 'border-green-500'}>
            <h3 className="font-serif text-lg font-bold mb-2">{result.validationOnly ? 'Validation Results' : 'Import Results'}</h3>
            <p className="text-sm text-muted-foreground mb-4">{result.message}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-3">
                <CheckCircle size={24} />
                <div>
                  <p className="text-2xl font-bold">{createdCount}</p>
                  <p className="text-xs uppercase tracking-wider font-semibold">{result.rolledBack ? 'Would create' : 'Created'}</p>
                </div>
              </div>
              <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex items-center gap-3">
                <CheckCircle size={24} />
                <div>
                  <p className="text-2xl font-bold">{updatedCount}</p>
                  <p className="text-xs uppercase tracking-wider font-semibold">{result.rolledBack ? 'Would update' : 'Updated'}</p>
                </div>
              </div>
            </div>

            {typeof result.roleGrantsSeeded === 'number' && (
              <p className="text-sm text-muted-foreground mb-4">
                {result.roleGrantsSeeded} role grant(s) seeded from the Role column.
              </p>
            )}
            {typeof result.invitationsSent === 'number' && <p className="text-sm text-muted-foreground mb-4">{result.invitationsSent} secure account invitation(s) sent. No passwords were stored in the workbook or returned by the import.</p>}

            {result.errors && result.errors.length > 0 && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><AlertTriangle size={16} /> Row errors ({result.errors.length}):</h4>
                <ul className="text-xs space-y-1 list-disc pl-4 max-h-[200px] overflow-y-auto">
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            {result.invitationErrors && result.invitationErrors.length > 0 && <div className="mt-4 bg-amber-50 text-amber-800 p-4 rounded-lg"><h4 className="font-bold text-sm mb-2">Invitations pending ({result.invitationErrors.length})</h4><ul className="text-xs space-y-1 list-disc pl-4">{result.invitationErrors.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
          </PremiumCard>
        )}

        <PremiumCard className="bg-secondary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold">Column Reference</h3>
              {importType === 'academic' ? (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Keep these sheets and import order: <strong>Schools → Departments → Programmes → Batches → Semesters → Subjects → Students → Teachers → Teaching Assignments</strong>. Use Validate Only first; it runs the complete database transaction and rolls it back. No accounts or invitations are created until Upload &amp; Import succeeds.</p>
              ) : importType === 'students' ? (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Required: <strong>Student_ID</strong>, <strong>Name</strong>, <strong>Email</strong>, <strong>Batch_ID</strong>, and <strong>Section</strong>. Each new email receives an invitation to choose a password.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Required: <strong>Teacher_ID</strong>, <strong>Name</strong>, and <strong>Email</strong>. Qualification and designation are optional. Elevated roles are assigned separately through University Roles so approval authority is never granted accidentally by a spreadsheet.
                </p>
              )}
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
    <ManualAccountPanel />
    </>
  );
};

export default BulkImportPanel;
