import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, FileText, GraduationCap, Paperclip, Plus, RefreshCw, Users, X } from 'lucide-react';
import {
  AssessmentSubmission,
  assessmentFileUrl,
  getAssessmentSubmissions,
  getTeacherAssessments,
  gradeAssessmentSubmission,
  TeacherAssessment,
} from '../api/assessmentService';
import TeacherAssignmentCreator from './TeacherAssignmentCreator';

interface Option { id: string; name: string }
interface Props { subjects: Option[]; examTypes: Option[] }
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'No deadline';

export default function TeacherAssignmentManager({ subjects, examTypes }: Props) {
  const [tab, setTab] = useState<'assessments' | 'create'>('assessments');
  const [rows, setRows] = useState<TeacherAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [subject, setSubject] = useState('all');
  const [active, setActive] = useState<TeacherAssessment | null>(null);
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [grading, setGrading] = useState<AssessmentSubmission | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { setRows(await getTeacherAssessments()); }
    catch (err: any) { setError(err?.response?.data?.message || 'Assessments could not be loaded. Try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => rows.filter(row => subject === 'all' || row.subjectId === subject), [rows, subject]);
  const upcoming = rows.filter(row => !row.dueDate || new Date(row.dueDate).getTime() >= Date.now()).length;

  const review = async (row: TeacherAssessment) => {
    setActive(row); setSubmissions([]); setSubmissionsLoading(true); setError(''); setNotice('');
    try { setSubmissions(await getAssessmentSubmissions(row.id)); }
    catch (err: any) { setError(err?.response?.data?.message || 'Submissions could not be loaded.'); }
    finally { setSubmissionsLoading(false); }
  };

  const openGrade = (row: AssessmentSubmission) => {
    setGrading(row); setScore(row.score == null ? '' : String(row.score)); setFeedback(row.feedback || ''); setError(''); setNotice('');
  };
  const saveGrade = async () => {
    if (!grading || !active) return;
    const numeric = Number(score);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return setError('Enter a score between 0 and 100.');
    setSaving(true); setError('');
    try {
      await gradeAssessmentSubmission(grading.id, numeric, feedback.trim());
      setNotice(`${grading.student?.name || grading.studentId} was graded. The score will remain hidden until examination staff publish it.`);
      setGrading(null); setScore(''); setFeedback('');
      setSubmissions(await getAssessmentSubmissions(active.id));
    } catch (err: any) { setError(err?.response?.data?.message || 'The grade could not be saved.'); }
    finally { setSaving(false); }
  };

  return <section className="assessment-page teacher-assessments">
    <div className="overview-heading"><div><span className="eyebrow">TEACHING / ASSESSMENT</span><h1>Set, review, and grade.</h1><p>Create clear assessment work and move every submission toward publication.</p></div><button className="action-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/>Refresh</button></div>
    <div className="assessment-tabs" role="tablist"><button role="tab" aria-selected={tab === 'assessments'} className={tab === 'assessments' ? 'active' : ''} onClick={() => setTab('assessments')}><ClipboardCheck size={17}/>Assessment register</button><button role="tab" aria-selected={tab === 'create'} className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}><Plus size={17}/>Create assessment</button></div>
    {error && !grading && <p className="workspace-error" role="alert">{error}</p>}
    {notice && <p className="workspace-success" role="status"><CheckCircle2 size={17}/>{notice}</p>}

    {tab === 'create' ? <TeacherAssignmentCreator subjects={subjects} examTypes={examTypes} onAssignmentCreated={async () => { await load(); setTab('assessments'); }} /> : <>
      <div className="teacher-assessment-summary"><div><span>Total assessments</span><strong>{rows.length}</strong></div><div><span>Currently open</span><strong>{upcoming}</strong></div><div><span>Subjects covered</span><strong>{new Set(rows.map(row => row.subjectId)).size}</strong></div><button className="action-lime" onClick={() => setTab('create')}><Plus size={16}/>New assessment</button></div>
      <div className="assessment-toolbar"><div><label htmlFor="teacher-assessment-subject">Subject</label><select id="teacher-assessment-subject" value={subject} onChange={event => setSubject(event.target.value)}><option value="all">All subjects</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><span>{filtered.length} assessment{filtered.length === 1 ? '' : 's'}</span></div>
      {loading ? <div className="assessment-loading" role="status"><span/>Loading assessments…</div> : filtered.length === 0 ? <div className="workspace-empty assessment-empty"><FileText size={30}/><h3>No assessments here yet.</h3><p>Create the first assessment for this subject and it will appear in the student portal.</p><button className="action-primary" onClick={() => setTab('create')}>Create assessment</button></div> : <div className="teacher-assessment-grid">{filtered.map(row => {
        const closed = Boolean(row.dueDate && new Date(row.dueDate).getTime() < Date.now());
        return <article className="teacher-assessment-card" key={row.id}><div className="teacher-assessment-top"><span className="assessment-card-marker"><FileText size={19}/></span><span className={`assessment-status ${closed ? 'closed' : 'open'}`}>{closed ? 'Closed' : 'Open'}</span></div><span className="assessment-kicker">{row.subject?.name || row.subjectId} · {row.examType}</span><h2>{row.title}</h2><p>{row.description || 'No additional instructions.'}</p><div className="teacher-assessment-meta"><span><CalendarDays size={15}/>{formatDate(row.dueDate)}</span>{row.fileUrl && <a href={assessmentFileUrl(row.fileUrl) || '#'} target="_blank" rel="noreferrer"><Paperclip size={15}/>Brief attached</a>}</div><button className="action-primary" onClick={() => void review(row)}><Users size={16}/>Review submissions</button></article>;
      })}</div>}
    </>}

    {active && <div className="workspace-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !grading) setActive(null); }}><div className="workspace-dialog submissions-dialog" role="dialog" aria-modal="true" aria-labelledby="submissions-title"><button className="dialog-close" aria-label="Close" onClick={() => setActive(null)}><X size={19}/></button><span className="eyebrow">{active.subject?.name} · {active.examType}</span><h2 id="submissions-title">{active.title}</h2><p className="dialog-intro">Grade each submission here. Saved grades move to the examination publication queue.</p>{submissionsLoading ? <div className="assessment-loading"><span/>Loading submissions…</div> : submissions.length === 0 ? <div className="workspace-empty"><Users size={28}/><h3>No submissions yet.</h3><p>Student work will appear here as it is submitted.</p></div> : <div className="submission-review-list">{submissions.map(row => <article key={row.id}><div className="submission-student"><span>{(row.student?.name || row.studentId).slice(0, 2).toUpperCase()}</span><div><strong>{row.student?.name || row.studentId}</strong><small>{row.studentId}{row.student?.section ? ` · ${row.student.section}` : ''}</small></div></div><div className="submission-response"><p>{row.submissionText || 'File submission'}</p>{row.fileUrl && <a className="attachment-link" href={assessmentFileUrl(row.fileUrl) || '#'} target="_blank" rel="noreferrer"><Paperclip size={15}/>Open submitted file</a>}<time>Submitted {formatDate(row.submissionDate)}</time></div><div className="submission-grade-state">{row.graded ? <><strong>{row.score}/100</strong><span>{row.gradingState === 'published' ? 'Published' : 'Awaiting publication'}</span></> : <span>Not graded</span>}<button className="table-action" disabled={row.gradingState === 'published'} onClick={() => openGrade(row)}>{row.gradingState === 'published' ? 'Locked' : row.graded ? 'Edit grade' : 'Grade'}</button></div></article>)}</div>}<div className="dialog-actions"><button className="action-secondary" onClick={() => setActive(null)}>Close</button></div></div></div>}

    {grading && <div className="workspace-dialog-backdrop grade-backdrop"><div className="workspace-dialog grade-dialog" role="dialog" aria-modal="true" aria-labelledby="grade-title"><button className="dialog-close" aria-label="Close" onClick={() => setGrading(null)}><X size={19}/></button><span className="dialog-icon"><GraduationCap size={23}/></span><h2 id="grade-title">Grade {grading.student?.name || grading.studentId}</h2><p>Save a score from 0 to 100. Students will see it only after examination staff publish the batch.</p><label htmlFor="grade-score">Score</label><div className="score-input"><input id="grade-score" type="number" min="0" max="100" step="0.5" value={score} onChange={event => setScore(event.target.value)} autoFocus/><span>/ 100</span></div><label htmlFor="grade-feedback">Feedback</label><textarea id="grade-feedback" rows={5} value={feedback} onChange={event => setFeedback(event.target.value)} placeholder="Give the student specific, useful feedback."/>{error && <p className="workspace-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="action-secondary" onClick={() => setGrading(null)}>Cancel</button><button className="action-primary" onClick={() => void saveGrade()} disabled={saving}>{saving ? 'Saving…' : 'Save grade'}</button></div></div></div>}
  </section>;
}
