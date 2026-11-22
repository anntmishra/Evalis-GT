import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, Clock3, FileText, Paperclip, RefreshCw, Send, Upload, X } from 'lucide-react';
import {
  assessmentFileUrl,
  getStudentAssessments,
  StudentAssessment,
  submitAssessment,
} from '../api/assessmentService';

type StatusFilter = 'all' | 'open' | 'submitted' | 'published' | 'closed';

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'No deadline';

const isClosed = (row: StudentAssessment) => Boolean(row.dueDate && new Date(row.dueDate).getTime() < Date.now() && !row.submitted);

function statusFor(row: StudentAssessment) {
  if (row.gradingState === 'published') return { label: 'Result published', className: 'published' };
  if (row.gradingState === 'awaiting_publication') return { label: 'Graded · awaiting release', className: 'awaiting' };
  if (row.submitted) return { label: 'Submitted', className: 'submitted' };
  if (isClosed(row)) return { label: 'Deadline passed', className: 'closed' };
  return { label: 'Open', className: 'open' };
}

export default function StudentAssignmentList() {
  const [rows, setRows] = useState<StudentAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [subject, setSubject] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [active, setActive] = useState<StudentAssessment | null>(null);
  const [mode, setMode] = useState<'details' | 'submit' | null>(null);
  const [answer, setAnswer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { setRows(await getStudentAssessments()); }
    catch (err: any) { setError(err?.response?.data?.message || 'Assessments could not be loaded. Try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const subjects = useMemo(() => Array.from(new Map(rows.map(row => [row.subject.id, row.subject])).values()), [rows]);
  const filtered = useMemo(() => rows.filter(row => {
    if (subject !== 'all' && row.subjectId !== subject) return false;
    if (status === 'open') return !row.submitted && !isClosed(row);
    if (status === 'submitted') return row.submitted && row.gradingState !== 'published';
    if (status === 'published') return row.gradingState === 'published';
    if (status === 'closed') return isClosed(row);
    return true;
  }), [rows, subject, status]);

  const openCount = rows.filter(row => !row.submitted && !isClosed(row)).length;
  const submittedCount = rows.filter(row => row.submitted && row.gradingState !== 'published').length;
  const publishedCount = rows.filter(row => row.gradingState === 'published').length;

  const openModal = (row: StudentAssessment, nextMode: 'details' | 'submit') => {
    setActive(row); setMode(nextMode); setAnswer(''); setFile(null); setError(''); setNotice('');
  };
  const closeModal = () => { if (!submitting) { setMode(null); setActive(null); setAnswer(''); setFile(null); } };

  const handleFile = (selected?: File) => {
    if (!selected) return setFile(null);
    if (selected.size > 10 * 1024 * 1024) return setError('The attachment must be 10 MB or smaller.');
    setError(''); setFile(selected);
  };

  const submit = async () => {
    if (!active || (!answer.trim() && !file)) return setError('Write an answer or attach a file before submitting.');
    setSubmitting(true); setError('');
    try {
      await submitAssessment(active.id, answer.trim(), file);
      setNotice(`${active.title} was submitted successfully.`);
      setMode(null); setActive(null); setAnswer(''); setFile(null);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Your assessment could not be submitted. Try again.');
    } finally { setSubmitting(false); }
  };

  return <section className="assessment-page">
    <div className="overview-heading"><div><span className="eyebrow">LEARNING / ASSESSMENTS</span><h1>Your work, clearly organised.</h1><p>Read the brief, submit before the deadline, and follow each result through publication.</p></div><button className="action-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/>Refresh</button></div>

    <div className="assessment-summary"><div><span>Open</span><strong>{openCount}</strong><small>Ready for your work</small></div><div><span>In review</span><strong>{submittedCount}</strong><small>Submitted or graded</small></div><div><span>Published</span><strong>{publishedCount}</strong><small>Results you can view</small></div></div>
    {error && !mode && <p className="workspace-error" role="alert">{error}</p>}
    {notice && <p className="workspace-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}

    <div className="assessment-toolbar"><div><label htmlFor="assessment-subject">Subject</label><select id="assessment-subject" value={subject} onChange={event => setSubject(event.target.value)}><option value="all">All subjects</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label htmlFor="assessment-status">Status</label><select id="assessment-status" value={status} onChange={event => setStatus(event.target.value as StatusFilter)}><option value="all">All statuses</option><option value="open">Open</option><option value="submitted">In review</option><option value="published">Published</option><option value="closed">Deadline passed</option></select></div><span>{filtered.length} assessment{filtered.length === 1 ? '' : 's'}</span></div>

    {loading ? <div className="assessment-loading" role="status"><span/>Loading your assessments…</div> : filtered.length === 0 ? <div className="workspace-empty assessment-empty"><BookOpen size={30}/><h3>Nothing in this view.</h3><p>Try a different filter or check back when your teacher adds an assessment.</p></div> : <div className="assessment-list">{filtered.map(row => {
      const state = statusFor(row);
      return <article className="assessment-card" key={row.id}><div className="assessment-card-marker"><FileText size={20}/></div><div className="assessment-card-main"><div className="assessment-card-top"><div><span className="assessment-kicker">{row.subject.name} · {row.examType}</span><h2>{row.title}</h2></div><span className={`assessment-status ${state.className}`}>{state.label}</span></div><p>{row.description || 'Open the assessment to read the full brief.'}</p><div className="assessment-meta"><span><CalendarDays size={15}/>{formatDate(row.dueDate)}</span><span><BookOpen size={15}/>{row.teacher?.name || 'Faculty'}</span>{row.submittedAt && <span><CheckCircle2 size={15}/>Submitted {formatDate(row.submittedAt)}</span>}</div></div><div className="assessment-card-action">{row.gradingState === 'published' ? <div className="assessment-grade"><strong>{row.grade}<small>/100</small></strong><span>{row.letterGrade || 'Published'}</span></div> : <Clock3 size={20}/>}<button className="action-secondary" onClick={() => openModal(row, 'details')}>View details</button>{!row.submitted && !isClosed(row) && <button className="action-primary" onClick={() => openModal(row, 'submit')}><Send size={15}/>Submit</button>}</div></article>;
    })}</div>}

    {mode && active && <div className="workspace-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}><div className="workspace-dialog assessment-dialog" role="dialog" aria-modal="true" aria-labelledby="assessment-dialog-title"><button className="dialog-close" aria-label="Close" onClick={closeModal}><X size={19}/></button><span className="eyebrow">{active.subject.name} · {active.examType}</span><h2 id="assessment-dialog-title">{mode === 'submit' ? `Submit ${active.title}` : active.title}</h2><div className="assessment-dialog-meta"><span><CalendarDays size={15}/>{formatDate(active.dueDate)}</span><span className={`assessment-status ${statusFor(active).className}`}>{statusFor(active).label}</span></div><div className="assessment-brief"><strong>Assessment brief</strong><p>{active.description || 'No additional instructions were provided.'}</p>{active.fileUrl && <a className="attachment-link" href={assessmentFileUrl(active.fileUrl) || '#'} target="_blank" rel="noreferrer"><Paperclip size={16}/>Open teacher attachment</a>}</div>
      {active.gradingState === 'published' && <div className="published-result"><div><span>Published score</span><strong>{active.grade}/100</strong><small>{active.letterGrade}</small></div><div><span>Teacher feedback</span><p>{active.feedback || 'No written feedback was added.'}</p></div></div>}
      {mode === 'submit' && <div className="submission-form"><label htmlFor="assessment-answer">Your answer</label><textarea id="assessment-answer" rows={7} value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Write your response, working, or a note about the attached file."/><label className="assessment-upload" htmlFor="assessment-file"><Upload size={19}/><span><strong>{file ? file.name : 'Attach supporting work'}</strong><small>PDF, document, text, or image · maximum 10 MB</small></span><input id="assessment-file" type="file" accept=".pdf,.doc,.docx,.txt,image/*" onChange={event => handleFile(event.target.files?.[0])}/></label></div>}
      {error && <p className="workspace-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="action-secondary" onClick={closeModal}>{mode === 'submit' ? 'Cancel' : 'Close'}</button>{mode === 'details' && !active.submitted && !isClosed(active) && <button className="action-primary" onClick={() => setMode('submit')}>Start submission</button>}{mode === 'submit' && <button className="action-primary" onClick={() => void submit()} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit assessment'}</button>}</div></div></div>}
  </section>;
}
