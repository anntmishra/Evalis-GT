import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Loader2, BarChart3 } from 'lucide-react';
import { createProposal, listProposals, getProposal } from '../api/governanceService';

const GovernanceAdminPanel: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('course_addition');
  const [options, setOptions] = useState<string[]>(['Yes', 'No']);
  const [newOption, setNewOption] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [voters, setVoters] = useState<any[]>([]);

  const load = async () => {
    try { setProposals(await listProposals()); } catch {}
  };
  useEffect(() => { load(); }, []);

  const openProposal = async (pid: string) => {
    try {
      setError(null);
      const data = await getProposal(pid);
      setSelectedProposal(data.proposal);
      setVoters(data.voters || []);
    } catch (e:any) {
      setError(e?.message || 'Failed to load proposal details');
    }
  };

  const addOption = () => {
    const o = newOption.trim();
    if (!o) return;
    setOptions(prev => [...prev, o]);
    setNewOption('');
  };

  const removeOption = (idx: number) => {
    setOptions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!title || !description || options.length < 2) {
      setError('Title, description and at least two options are required.');
      return;
    }
    try {
      setSaving(true);
      await createProposal({ title, description, type, options });
      setSuccess('Proposal created and teachers notified.');
      setTitle(''); setDescription(''); setOptions(['Yes', 'No']);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to create proposal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Governance (DAO-lite)
        </CardTitle>
        <CardDescription>Create proposals and request votes from teachers</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="g-title">Title</Label>
            <Input id="g-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Add Data Ethics course to Semester 5" />
          </div>
          <div>
            <Label htmlFor="g-type">Type</Label>
            <select id="g-type" className="w-full px-3 py-2 border border-gray-200 rounded-md" value={type} onChange={e => setType(e.target.value)}>
              <option value="course_addition">Course Addition</option>
              <option value="curriculum_update">Curriculum Update</option>
              <option value="resource_allocation">Resource Allocation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label htmlFor="g-desc">Description</Label>
            <textarea 
              id="g-desc"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Provide context, options impact, and relevant links"
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-black focus:ring-black min-h-[120px]"
            />
          </div>
          <div>
            <Label>Options</Label>
            <div className="flex gap-2 mt-2">
              <Input value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Add an option" />
              <Button type="button" onClick={addOption} className="bg-black text-white">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {options.map((opt, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {opt}
                  {options.length > 2 && (
                    <button type="button" className="ml-2 text-red-500" onClick={() => removeOption(idx)}>x</button>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-black text-white">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Plus className="h-4 w-4 mr-2"/>Create Proposal</>}
            </Button>
          </div>
        </form>

        {/* Recent proposals */}
        <div className="mt-8">
          <h3 className="font-semibold text-black mb-2">Recent Proposals</h3>
          <div className="space-y-2">
            {proposals.slice(0,5).map(p => (
              <div key={p.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-600">{p.type} • {p.status}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openProposal(p.id)}>View Votes</Button>
                  </div>
                </div>
              </div>
            ))}
            {proposals.length === 0 && <div className="text-sm text-gray-600">No proposals yet.</div>}
          </div>
          {selectedProposal && (
            <div className="mt-4 p-4 bg-white rounded border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold">{selectedProposal.title}</div>
                  <div className="text-xs text-gray-600">{selectedProposal.type}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setSelectedProposal(null); setVoters([]); }}>Close</Button>
              </div>
              <div className="text-sm text-gray-700 mb-3">{selectedProposal.description}</div>
              <div>
                <h4 className="font-medium mb-2">Voters</h4>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {voters.length === 0 && <div className="text-sm text-gray-600">No votes yet.</div>}
                  {voters.map(v => (
                    <div key={`${v.teacherId}-${v.votedAt}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium text-sm">{v.teacherName}</div>
                        <div className="text-xs text-gray-600">{v.teacherEmail || v.teacherId}</div>
                      </div>
                      <div className="text-sm">{v.choiceLabel ?? `Choice #${v.choiceIndex+1}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GovernanceAdminPanel;
