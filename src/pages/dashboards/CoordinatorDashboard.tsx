import { getWorkspaceCatalog } from '../../api/workspaceService';
import React, { useEffect, useState } from 'react';
import PremiumCard from '../../components/ui/PremiumCard';
import { Button } from '../../components/ui/button';
import { BookOpen, Users, UserPlus, X, Plus } from 'lucide-react';
import axios from 'axios';
import config from '../../config/environment';
import { getAllBatches } from '../../api/batchService';
import { getTeachers } from '../../api/teacherService';
import { getAllSubjects } from '../../api/subjectService';

const getAuthHeader = () => {
  const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const CoordinatorDashboardOverview = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sections: 0, assignments: 0, teachers: 0 });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // Modal for creating a new assignment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    teacherId: '',
    subjectId: '',
    batchId: '',
    sectionName: '',
    sessionType: 'lecture',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeader();
      const [assignRes, catalog] = await Promise.all([
        axios.get(`${config.API_BASE_URL}/teaching-assignments`, { headers }),
        getWorkspaceCatalog(),
      ]);
      const assignData = assignRes.data;
      const { teachers: teacherData, subjects: subjectData, batches: batchData } = catalog;

      setAssignments(Array.isArray(assignData) ? assignData : []);
      setTeachers(teacherData);
      setSubjects(subjectData);
      setBatches(batchData);
      setStats({
        sections: batchData.length,
        assignments: Array.isArray(assignData) ? assignData.length : 0,
        teachers: teacherData.length,
      });
    } catch (err) {
      setFormError('Unable to load coordinator data. Please refresh to retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacherId || !form.batchId || !form.subjectId || !form.sectionName.trim()) {
      setFormError('Please select a teacher, batch, subject, and section.');
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      // Need a sectionId — we'll create/find a default section for the subject
      // First, try to get or create a section for this subject
      const headers = getAuthHeader();
      let sectionId: string | number = '';

      // Try to fetch existing sections for the subject
      const sectionsRes = await axios.get(
        `${config.API_BASE_URL}/sections?subjectId=${form.subjectId}`,
        { headers }
      );
      const existingSections = sectionsRes.data || [];

      const matchingSection = existingSections.find((section: any) => section.name.toLowerCase() === form.sectionName.trim().toLowerCase());
      if (matchingSection) {
        sectionId = matchingSection.id;
      } else {
        // Auto-create a section
        const subject = subjects.find((s: any) => s.id === form.subjectId);
        const newSection = await axios.post(`${config.API_BASE_URL}/sections`, {
          name: form.sectionName.trim(),
          subjectId: form.subjectId,
          semesterId: subject?.semesterId || null,
          capacity: 60,
        }, { headers });
        sectionId = newSection.data.id;
      }

      // Now create the teaching assignment
      await axios.post(`${config.API_BASE_URL}/teaching-assignments`, {
        teacherId: form.teacherId,
        sectionId,
        subjectId: form.subjectId,
        sessionType: form.sessionType,
        batchId: form.batchId || null,
      }, { headers });

      setIsModalOpen(false);
      setForm({ teacherId: '', subjectId: '', batchId: '', sectionName: '', sessionType: 'lecture' });
      fetchAll();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id: string | number) => {
    if (!confirm('Remove this teaching assignment?')) return;
    try {
      const headers = getAuthHeader();
      await axios.delete(`${config.API_BASE_URL}/teaching-assignments/${id}`, { headers });
      setAssignments(assignments.filter((a: any) => a.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove assignment.');
    }
  };

  return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Coordinator Dashboard</h1>
            <p className="text-muted-foreground font-sans mt-2 max-w-2xl text-lg">
              Manage teaching assignments for your department's batches.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus size={16} /> New Assignment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PremiumCard className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Batches</p>
              <h2 className="font-serif text-2xl font-bold">{loading ? '-' : stats.sections}</h2>
            </div>
          </PremiumCard>

          <PremiumCard className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assignments</p>
              <h2 className="font-serif text-2xl font-bold">{loading ? '-' : stats.assignments}</h2>
            </div>
          </PremiumCard>

          <PremiumCard className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
              <UserPlus size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Teachers</p>
              <h2 className="font-serif text-2xl font-bold">{loading ? '-' : stats.teachers}</h2>
            </div>
          </PremiumCard>
        </div>

        {/* Teaching Assignments Table */}
        <PremiumCard title="Teaching Assignments" subtitle="Teachers assigned to subjects and sections" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Subject</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Section</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Session Type</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Teacher</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading assignments...</td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No assignments yet. Click "New Assignment" to get started.
                    </td>
                  </tr>
                ) : (
                  assignments.map((row: any) => (
                    <tr key={row.id} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-medium">{row.Subject?.name || row.subject?.name || `Subject #${row.subjectId}`}</td>
                      <td className="px-6 py-4 text-muted-foreground">{row.Section?.name || row.section?.name || `Section #${row.sectionId}`}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium border border-border">
                          {row.sessionType || 'Lecture'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{row.Teacher?.name || row.teacher?.name || `Teacher #${row.teacherId}`}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteAssignment(row.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </PremiumCard>
      {/* New Assignment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-md animate-fade-in">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">New Teaching Assignment</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="px-6 py-4 space-y-4">
              {formError && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{formError}</p>}

              <div className="space-y-2">
                <label className="text-sm font-medium">Teacher</label>
                <select
                  required value={form.teacherId}
                  onChange={e => setForm({ ...form, teacherId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select teacher...</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Batch</label>
                <select
                  required value={form.batchId}
                  onChange={e => setForm({ ...form, batchId: e.target.value, subjectId: '' })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select batch...</option>
                  {batches.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <select
                  required value={form.subjectId}
                  onChange={e => setForm({ ...form, subjectId: e.target.value })}
                  disabled={!form.batchId}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select subject...</option>
                  {subjects.filter((s: any) => s.batchId === form.batchId).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Section</label>
                <input required value={form.sectionName} onChange={e => setForm({ ...form, sectionName: e.target.value })} placeholder="e.g. CSE-A" className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Session Type</label>
                <select
                  value={form.sessionType}
                  onChange={e => setForm({ ...form, sessionType: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="lecture">Lecture</option>
                  <option value="lab">Lab</option>
                  <option value="tutorial">Tutorial</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorDashboardOverview;
