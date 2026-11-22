import React, { useEffect, useState } from 'react';
import { Users, X, Save, Search } from 'lucide-react';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';
import {
  getMyStudents,
  updateStudent,
  getSpecializations,
  getSectionGroups,
  CoordinatorStudent,
  SpecializationOption,
  SectionGroupSummary,
} from '../../api/coordinatorService';
import { getAllBatches } from '../../api/batchService';
import { getBatchSemesters } from '../../api/semesterService';

const CoordinatorStudents = () => {
  const [students, setStudents] = useState<CoordinatorStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [batches, setBatches] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationOption[]>([]);

  const [editing, setEditing] = useState<CoordinatorStudent | null>(null);
  const [form, setForm] = useState<any>({});
  const [groupOptions, setGroupOptions] = useState<SectionGroupSummary[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadStudents = () => {
    setLoading(true);
    getMyStudents()
      .then(setStudents)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load students'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStudents();
    getAllBatches().then((data: any) => setBatches(Array.isArray(data) ? data : data?.batches || [])).catch(() => {});
    getSpecializations().then(setSpecializations).catch(() => {});
  }, []);

  const openEdit = async (student: CoordinatorStudent) => {
    setEditing(student);
    setSaveError(null);
    setForm({
      name: student.name,
      email: student.email || '',
      section: student.section || '',
      batch: student.batch,
      specializationId: student.specializationId || '',
      sectionGroupId: student.sectionGroupId || '',
    });
    setGroupOptions([]);
    try {
      const semesters = await getBatchSemesters(student.batch);
      const activeSemester = semesters.find((s) => s.active) || semesters[0];
      if (activeSemester) {
        const groups = await getSectionGroups(student.batch, activeSemester.id);
        setGroupOptions(groups);
      }
    } catch {
      // No groups set up yet for this batch/semester -- fine, dropdown just stays empty.
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateStudent(editing.id, {
        name: form.name,
        email: form.email,
        section: form.section,
        batch: form.batch,
        specializationId: form.specializationId || null,
        sectionGroupId: form.sectionGroupId || null,
      });
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditing(null);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">My Students</h2>
        <p className="text-muted-foreground font-sans mt-1 text-sm">
          Students across every batch assigned to you. Click a row to edit their details.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full pl-9 pr-3 py-2 border rounded-lg bg-background text-sm"
          placeholder="Search by name, ID, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <PremiumCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Batch</th>
                <th className="px-6 py-4 font-medium">Specialization</th>
                <th className="px-6 py-4 font-medium">Section</th>
                <th className="px-6 py-4 font-medium">Group</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading students...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-destructive">{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-muted-foreground/50" />
                      <p>{students.length === 0 ? "You aren't assigned as coordinator for any batch yet." : 'No students match your search.'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEdit(s)}>
                    <td className="px-6 py-4 font-medium text-foreground">{s.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{s.email || '—'}</td>
                    <td className="px-6 py-4">{s.Batch?.name || s.batch}</td>
                    <td className="px-6 py-4">{s.Specialization?.name || '—'}</td>
                    <td className="px-6 py-4">{s.section || '—'}</td>
                    <td className="px-6 py-4">{s.SectionGroup?.name || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-lg animate-fade-in">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Edit Student -- {editing.id}</h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Email <span className="text-xs text-muted-foreground">(used for portal login)</span></label>
                <input className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Batch</label>
                  <select
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                    value={form.batch}
                    onChange={async (e) => {
                      const batchId = e.target.value;
                      setForm({ ...form, batch: batchId, sectionGroupId: '' });
                      try {
                        const semesters = await getBatchSemesters(batchId);
                        const activeSemester = semesters.find((s) => s.active) || semesters[0];
                        setGroupOptions(activeSemester ? await getSectionGroups(batchId, activeSemester.id) : []);
                      } catch {
                        setGroupOptions([]);
                      }
                    }}
                  >
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Section</label>
                  <input className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Specialization</label>
                  <select className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm" value={form.specializationId} onChange={(e) => setForm({ ...form, specializationId: e.target.value })}>
                    <option value="">None</option>
                    {specializations.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Lecture Group</label>
                  <select className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm" value={form.sectionGroupId} onChange={(e) => setForm({ ...form, sectionGroupId: e.target.value })}>
                    <option value="">None</option>
                    {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.studentCount})</option>)}
                  </select>
                </div>
              </div>

              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorStudents;
