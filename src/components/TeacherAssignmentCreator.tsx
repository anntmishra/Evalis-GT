import { FormEvent, useState } from 'react';
import { CalendarDays, CheckCircle2, FileText, Paperclip, Plus, X } from 'lucide-react';
import { createAssessment } from '../api/assessmentService';

interface Option { id: string; name: string }
interface Props { subjects: Option[]; examTypes: Option[]; onAssignmentCreated?: () => void | Promise<void> }

export default function TeacherAssignmentCreator({ subjects, examTypes, onAssignmentCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectFile = (selected?: File) => {
    if (!selected) return setFile(null);
    if (selected.size > 10 * 1024 * 1024) return setError('The attachment must be 10 MB or smaller.');
    setError(''); setFile(selected);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (!title.trim() || !subjectId || !examType) return setError('Title, subject, and assessment type are required.');
    if (dueDate && new Date(dueDate).getTime() <= Date.now()) return setError('Choose a deadline in the future.');
    setBusy(true);
    try {
      await createAssessment({ title: title.trim(), description: description.trim(), subjectId, examType, dueDate: dueDate || null, file });
      setSuccess(`${title.trim()} is now available in the student assessment portal.`);
      setTitle(''); setDescription(''); setSubjectId(''); setExamType(''); setDueDate(''); setFile(null);
      await onAssignmentCreated?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'The assessment could not be created. Try again.');
    } finally { setBusy(false); }
  };

  return <section className="assessment-create-panel"><div className="assessment-create-copy"><span className="eyebrow light">CREATE AN ASSESSMENT</span><h2>Set the work in motion.</h2><p>Give students a clear brief, a fair deadline, and any supporting material they need.</p><div className="create-principles"><span><CheckCircle2 size={16}/>Appears in the assigned student batch</span><span><CheckCircle2 size={16}/>Submissions stay private to authorised faculty</span><span><CheckCircle2 size={16}/>Scores remain hidden until publication</span></div></div><form className="assessment-create-form" onSubmit={submit}><div className="field-wide"><label htmlFor="assessment-title">Assessment title</label><input id="assessment-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Data structures case study" required/></div><div><label htmlFor="assessment-subject-create">Subject</label><select id="assessment-subject-create" value={subjectId} onChange={event => setSubjectId(event.target.value)} required><option value="">Choose subject</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label htmlFor="assessment-type">Assessment type</label><select id="assessment-type" value={examType} onChange={event => setExamType(event.target.value)} required><option value="">Choose type</option>{examTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field-wide"><label htmlFor="assessment-description">Brief and instructions</label><textarea id="assessment-description" rows={6} value={description} onChange={event => setDescription(event.target.value)} placeholder="Explain the task, expected outcome, and evaluation criteria."/></div><div><label htmlFor="assessment-deadline">Deadline</label><div className="input-with-icon"><CalendarDays size={17}/><input id="assessment-deadline" type="datetime-local" value={dueDate} min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)} onChange={event => setDueDate(event.target.value)}/></div></div><div><label>Supporting material</label><label className="compact-upload" htmlFor="assessment-brief-file"><Paperclip size={17}/><span>{file ? file.name : 'Attach a file'}</span><input id="assessment-brief-file" type="file" accept="image/*,.pdf,.doc,.docx,.ppt,.pptx" onChange={event => selectFile(event.target.files?.[0])}/></label>{file && <button type="button" className="remove-file" onClick={() => setFile(null)}><X size={14}/>Remove</button>}</div>{error && <p className="workspace-error field-wide" role="alert">{error}</p>}{success && <p className="workspace-success field-wide" role="status"><CheckCircle2 size={17}/>{success}</p>}<div className="field-wide create-submit"><span><FileText size={17}/>Students can submit text, a file, or both.</span><button className="action-lime" disabled={busy || !subjects.length}>{busy ? 'Creating…' : <><Plus size={16}/>Create assessment</>}</button></div></form></section>;
}
