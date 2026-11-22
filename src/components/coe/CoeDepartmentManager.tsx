import api from '../../api/index.js';
import React, { useState, useEffect } from 'react';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';
import { Building2, UserPlus, Plus, X } from 'lucide-react';
import { assignHod } from '../../api/hierarchyService';
import { getDepartments, createDepartment } from '../../api/coeService';

const CoeDepartmentManager = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Create dept modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', schoolId: '' });
  const [schools, setSchools] = useState<Array<{id:string;name:string}>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HOD assignment modal
  const [hodModal, setHodModal] = useState<{ open: boolean; deptId: string; deptName: string }>({ open: false, deptId: '', deptName: '' });
  const [hodEmail, setHodEmail] = useState('');

  useEffect(() => {
    fetchDepartments();
    api.get('/schools').then(response => setSchools(response.data)).catch(() => setError('Unable to load schools.'));
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Unable to load departments. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await createDepartment(form);
      setIsModalOpen(false);
      setForm({ name: '', code: '', description: '', schoolId: '' });
      fetchDepartments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openHodModal = (dept: any) => {
    setHodEmail('');
    setHodModal({ open: true, deptId: dept.id, deptName: dept.name });
  };

  const handleAssignHod = async () => {
    if (!hodEmail.trim()) return;
    setAssigning(hodModal.deptId);
    try {
      await assignHod(hodModal.deptId, hodEmail.trim());
      setHodModal({ open: false, deptId: '', deptName: '' });
      alert(`HOD role assigned to ${hodEmail} successfully!`);
      fetchDepartments();
    } catch (err: any) {
      alert(`Failed to assign HOD: ${err.response?.data?.message || err.message}`);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Department Management</h2>
          <p className="text-muted-foreground font-sans mt-1 text-sm">
            Oversee university departments and assign Executive Heads of Department (HODs).
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 shrink-0">
          <Plus size={16} /> Add Department
        </Button>
      </div>

      <PremiumCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Code</th>
                <th className="px-6 py-4 font-medium tracking-wider">Department Name</th>
                <th className="px-6 py-4 font-medium tracking-wider">Description</th>
                <th className="px-6 py-4 font-medium tracking-wider">Programs</th>
                <th className="px-6 py-4 font-medium tracking-wider">HOD</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading departments...</td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 size={32} className="text-muted-foreground/50" />
                      <p>No departments found.</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsModalOpen(true)}>
                        Create First Department
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{dept.code}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{dept.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{dept.description || '—'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{dept.Programs?.length || 0}</td>
                    <td className="px-6 py-4 text-sm text-foreground font-medium">
                      {dept.HODs && dept.HODs.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          {dept.HODs[0].userId}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openHodModal(dept)}
                        disabled={assigning === dept.id}
                        className="flex items-center gap-2"
                      >
                        <UserPlus size={16} />
                        {assigning === dept.id ? 'Assigning...' : (dept.HODs && dept.HODs.length > 0 ? 'Change HOD' : 'Assign HOD')}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      {/* Create Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-md animate-fade-in">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Add New Department</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateDept} className="px-6 py-4 space-y-4">
              {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
              <div className="space-y-2"><label className="text-sm font-medium" htmlFor="department-school">School</label><select id="department-school" required value={form.schoolId} onChange={e => setForm({ ...form, schoolId: e.target.value })} className="w-full px-3 py-2 bg-background border border-input rounded-md"><option value="">Select a school</option>{schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}</select>{!schools.length && <p className="text-xs text-muted-foreground">Create a school first.</p>}</div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department Name</label>
                <input
                  required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Computer Science"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department Code</label>
                <input
                  required value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., CS"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Department'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign HOD Modal */}
      {hodModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm animate-fade-in">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Assign HOD</h3>
              <button onClick={() => setHodModal({ open: false, deptId: '', deptName: '' })} className="text-muted-foreground hover:text-foreground p-1">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Assign a Head of Department to <span className="font-medium text-foreground">{hodModal.deptName}</span>.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">HOD Email Address</label>
                <input
                  type="email" value={hodEmail}
                  onChange={e => setHodEmail(e.target.value)}
                  placeholder="hod@university.edu"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setHodModal({ open: false, deptId: '', deptName: '' })}>Cancel</Button>
                <Button onClick={handleAssignHod} disabled={!hodEmail.trim() || !!assigning}>
                  {assigning ? 'Assigning...' : 'Assign HOD'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoeDepartmentManager;
