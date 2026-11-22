import React, { useEffect, useState } from 'react';
import { Users2, Plus } from 'lucide-react';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';
import { getSectionGroups, createSectionGroup, SectionGroupSummary } from '../../api/coordinatorService';
import { getAllBatches } from '../../api/batchService';
import { getBatchSemesters, Semester } from '../../api/semesterService';

const CoordinatorGroups = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [batchId, setBatchId] = useState('');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semesterId, setSemesterId] = useState('');
  const [groups, setGroups] = useState<SectionGroupSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllBatches().then((data: any) => {
      const list = Array.isArray(data) ? data : data?.batches || [];
      setBatches(list);
      if (list.length > 0) setBatchId(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!batchId) return;
    getBatchSemesters(batchId).then((list) => {
      setSemesters(list);
      const active = list.find((s) => s.active) || list[0];
      setSemesterId(active?.id || '');
    }).catch(() => setSemesters([]));
  }, [batchId]);

  const loadGroups = () => {
    if (!batchId || !semesterId) return;
    setLoading(true);
    getSectionGroups(batchId, semesterId)
      .then(setGroups)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load groups'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, semesterId]);

  const handleCreate = async () => {
    if (!newGroupName.trim() || !batchId || !semesterId) return;
    setCreating(true);
    setError(null);
    try {
      await createSectionGroup({ name: newGroupName.trim(), batchId, semesterId });
      setNewGroupName('');
      loadGroups();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Lecture Groups</h2>
        <p className="text-muted-foreground font-sans mt-1 text-sm">
          Combine sections into a shared lecture group (e.g. 4 sections of 30 students into one 120-student lecture), scoped to a batch and semester.
        </p>
      </div>

      <div className="flex gap-4 max-w-xl">
        <div className="flex-1">
          <label className="text-sm font-medium">Batch</label>
          <select className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Semester</label>
          <select className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
            {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <PremiumCard className="max-w-xl">
        <h3 className="font-semibold text-sm mb-3">Create a new group</h3>
        <div className="flex gap-3">
          <input
            className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
            placeholder="e.g. Lecture Group 1"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <Button onClick={handleCreate} disabled={creating || !newGroupName.trim()} className="flex items-center gap-2">
            <Plus size={16} /> {creating ? 'Creating...' : 'Create'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </PremiumCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading groups...</p>
        ) : groups.length === 0 ? (
          <PremiumCard className="md:col-span-3">
            <div className="text-center py-8 text-muted-foreground">
              <Users2 size={32} className="mx-auto mb-2 opacity-50" />
              <p>No lecture groups yet for this batch/semester.</p>
            </div>
          </PremiumCard>
        ) : (
          groups.map((g) => (
            <PremiumCard key={g.id}>
              <h4 className="font-bold">{g.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">{g.studentCount} student(s)</p>
            </PremiumCard>
          ))
        )}
      </div>
    </div>
  );
};

export default CoordinatorGroups;
