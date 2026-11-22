import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, ClipboardList, RefreshCw } from 'lucide-react';
import { getBatchesForPublishing, publishResults } from '../../api/coeService';

type BatchResult = {
  id: string; batchName: string; semester: string; totalStudents: number;
  totalSubmissions: number; gradedPercentage: number; status: 'ready' | 'published' | 'grading' | 'no-data';
};

export default function CoeResultsManager() {
  const [batches, setBatches] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [confirmBatch, setConfirmBatch] = useState<BatchResult | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await getBatchesForPublishing();
      setBatches(response.data.data as BatchResult[]);
    } catch {
      setError('Results could not be loaded. Check your connection and try again.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const publish = async () => {
    if (!confirmBatch) return;
    const batch = confirmBatch;
    setConfirmBatch(null); setPublishing(batch.id); setError(''); setNotice('');
    try {
      await publishResults(batch.id);
      setNotice(`Graded results for ${batch.batchName} are now visible to students.`);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Results could not be published. Review grading and try again.');
    } finally { setPublishing(null); }
  };

  const ready = batches.filter(batch => batch.status === 'ready').length;
  const published = batches.filter(batch => batch.status === 'published').length;
  return <section className="overview-page">
    <div className="overview-heading"><div><span className="eyebrow">EXAMINATIONS / RESULTS</span><h1>Release with confidence.</h1><p>Only fully graded batches can be published to student workspaces.</p></div><button className="action-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Refresh</button></div>
    <div className="results-summary"><div><span>Batches in scope</span><strong>{batches.length}</strong></div><div><span>Ready to publish</span><strong>{ready}</strong></div><div><span>Published</span><strong>{published}</strong></div></div>
    {error && <p className="workspace-error" role="alert">{error}</p>}
    {notice && <p className="workspace-success" role="status"><CheckCircle size={17}/>{notice}</p>}
    <section className="workspace-panel"><div className="panel-heading"><div><span className="eyebrow">PUBLICATION QUEUE</span><h2>Batch results</h2></div><ClipboardList size={19}/></div>
      {loading ? <div className="workspace-empty" role="status">Loading results…</div> : batches.length === 0 ? <div className="workspace-empty"><ClipboardList size={28}/><h3>No results to publish yet.</h3><p>Results appear when students submit work in an academic batch.</p></div> : <div className="table-scroll"><table className="landscape-table"><thead><tr><th>Academic batch</th><th>Session</th><th>Students</th><th>Submissions</th><th>Graded</th><th>Status</th><th>Action</th></tr></thead><tbody>{batches.map(batch => <tr key={batch.id}><td><strong>{batch.batchName}</strong></td><td>{batch.semester}</td><td>{batch.totalStudents}</td><td>{batch.totalSubmissions}</td><td>{batch.gradedPercentage}%</td><td><span className={`result-status status-${batch.status}`}>{batch.status === 'no-data' ? 'No submissions' : batch.status === 'ready' ? 'Ready' : batch.status === 'published' ? 'Published' : 'Grading'}</span></td><td><button className="table-action" disabled={batch.status !== 'ready' || publishing === batch.id} onClick={() => setConfirmBatch(batch)}>{publishing === batch.id ? 'Publishing…' : batch.status === 'published' ? 'Published' : 'Publish'}</button></td></tr>)}</tbody></table></div>}
    </section>
    {confirmBatch && <div className="workspace-dialog-backdrop" role="presentation"><div className="workspace-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title"><span className="dialog-icon"><AlertCircle size={23}/></span><h2 id="publish-title">Publish {confirmBatch.batchName} results?</h2><p>Students will be able to see graded scores and feedback for this batch. This action records the publication time.</p><div className="dialog-actions"><button className="action-secondary" onClick={() => setConfirmBatch(null)}>Cancel</button><button className="action-primary" onClick={() => void publish()}>Publish results</button></div></div></div>}
  </section>;
}
