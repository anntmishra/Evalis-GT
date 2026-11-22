import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';
import { decideQuestionPaper, getQuestionPaper, getQuestionPaperApprovals, QuestionPaperDecision } from '../../api/questionPaperService';

export default function QuestionPaperApprovals() {
  const [rows, setRows] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { setRows(await getQuestionPaperApprovals()); }
    catch (err: any) { setError(err?.response?.data?.message || 'Unable to load question paper approvals.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const open = async (id: string) => {
    setBusy(id); setError('');
    try { setPreview(await getQuestionPaper(id)); setComment(''); }
    catch (err: any) { setError(err?.response?.data?.message || 'Unable to open this paper.'); }
    finally { setBusy(''); }
  };
  const decide = async (action: QuestionPaperDecision) => {
    if (!preview) return;
    if (action !== 'approve' && !comment.trim()) return setError('Add a reviewer comment before returning or rejecting a paper.');
    setBusy(preview.id); setError('');
    try { await decideQuestionPaper(preview.id, action, comment.trim()); setPreview(null); setComment(''); await load(); }
    catch (err: any) { setError(err?.response?.data?.message || 'The decision could not be saved.'); }
    finally { setBusy(''); }
  };

  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-4"><div><h1 className="font-serif text-3xl font-bold">Question paper approvals</h1><p className="mt-1 text-muted-foreground">Review content, marks, and course alignment before forwarding or final publication.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className="mr-2"/>Refresh</Button></div>
    {error && <p role="alert" className="workspace-error">{error}</p>}
    <PremiumCard className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="px-6 py-4">Paper</th><th className="px-6 py-4">Subject</th><th className="px-6 py-4">Submitted by</th><th className="px-6 py-4">Marks</th><th className="px-6 py-4">Stage</th><th className="px-6 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">
      {loading ? <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Loading approvals…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No papers are waiting at your approval stage.</td></tr> : rows.map(row => <tr key={row.id}><td className="px-6 py-4"><strong>{row.title}</strong><small className="block text-muted-foreground">{row.examType} · v{row.version}</small></td><td className="px-6 py-4">{row.Subject?.name || row.subjectId}</td><td className="px-6 py-4">{row.Teacher?.name || row.teacherId}</td><td className="px-6 py-4">{row.totalMarks}</td><td className="px-6 py-4 capitalize">{String(row.status).replace('_', ' ')}</td><td className="px-6 py-4 text-right"><Button size="sm" variant="outline" onClick={() => void open(row.id)} disabled={busy === row.id}><Eye size={15} className="mr-2"/>Review</Button></td></tr>)}
    </tbody></table></div></PremiumCard>
    {preview && <div className="workspace-modal-backdrop" onClick={() => setPreview(null)}><section role="dialog" aria-modal="true" aria-label="Question paper review" className="workspace-modal max-w-4xl" onClick={event => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">{preview.examType} · {preview.totalMarks} marks · {preview.durationMinutes} minutes</span><h2>{preview.title}</h2><p>{preview.Subject?.name} · submitted by {preview.Teacher?.name}</p></div><button onClick={() => setPreview(null)}>Close</button></div><div className="mt-6 max-h-[48vh] space-y-3 overflow-y-auto">{preview.questions?.map((question:any,index:number) => <article key={question.id || index} className="rounded-lg border p-4"><strong>{index + 1}. {question.text}</strong><p className="mt-1 text-sm text-muted-foreground">{question.type} · {question.marks} marks</p>{question.mcqOptions?.length ? <ol className="mt-2 list-inside list-[lower-alpha]">{question.mcqOptions.map((option:any) => <li key={option.id}>{option.text}</li>)}</ol> : null}</article>)}</div><label className="mt-5 block text-sm font-medium" htmlFor="review-comment">Reviewer comment</label><textarea id="review-comment" className="mt-2 min-h-24 w-full rounded-md border bg-background p-3" value={comment} onChange={event => setComment(event.target.value)} placeholder="Required when requesting changes or rejecting."/><div className="mt-5 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => void decide('reject')} disabled={Boolean(busy)}><XCircle size={16} className="mr-2"/>Reject</Button><Button variant="outline" onClick={() => void decide('request_changes')} disabled={Boolean(busy)}><RotateCcw size={16} className="mr-2"/>Request changes</Button><Button onClick={() => void decide('approve')} disabled={Boolean(busy)}><CheckCircle2 size={16} className="mr-2"/>{preview.status === 'pending_hod' ? 'Forward to COE' : 'Final approve'}</Button></div></section></div>}
  </div>;
}
