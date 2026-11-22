import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Clock3, FileText, RefreshCw } from 'lucide-react';
import api from '../api/index.mjs';

type Result = {
  id: number; score: number | null; letterGrade: string | null; feedback: string;
  gradingState: string; subjectName: string; submissionDate: string;
  Assignment?: { title: string; description?: string };
};

export default function StudentResults() {
  const [rows, setRows] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setRows((await api.get('/students/submissions')).data); } catch { setError('Results could not be loaded. Try again.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const published = rows.filter(row => row.gradingState === 'published');
  const awaiting = rows.length - published.length;
  return <section className="assessment-page student-results-page"><div className="overview-heading"><div><span className="eyebrow">LEARNING / RESULTS</span><h1>Feedback you can build on.</h1><p>Scores appear here after grading is complete and examination staff release the result.</p></div><button className="action-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/>Refresh</button></div><div className="assessment-summary"><div><span>Submitted</span><strong>{rows.length}</strong><small>Assessments sent</small></div><div><span>Awaiting release</span><strong>{awaiting}</strong><small>Grading or publication</small></div><div><span>Published</span><strong>{published.length}</strong><small>Results available</small></div></div>{error && <p className="workspace-error" role="alert">{error}</p>}{loading ? <div className="assessment-loading"><span/>Loading results…</div> : rows.length === 0 ? <div className="workspace-empty assessment-empty"><Award size={30}/><h3>No submitted assessments yet.</h3><p>Your results journey begins after you submit your first assessment.</p></div> : <div className="result-card-list">{rows.map(row => { const released = row.gradingState === 'published'; return <article key={row.id} className={`result-card ${released ? 'released' : ''}`}><div className="result-card-icon">{released ? <CheckCircle2 size={22}/> : <Clock3 size={22}/>}</div><div><span className="assessment-kicker">{row.subjectName}</span><h2>{row.Assignment?.title || 'Assessment'}</h2><p>{released ? row.feedback || 'No written feedback was added.' : 'Your submission is being graded or is waiting for publication.'}</p></div><div className="result-card-score">{released ? <><strong>{row.score}<small>/100</small></strong><span>{row.letterGrade || 'Published'}</span></> : <><FileText size={20}/><span>Awaiting release</span></>}</div></article>; })}</div>}</section>;
}
