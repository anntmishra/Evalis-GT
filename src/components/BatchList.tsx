import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { getAllBatches, createBatch, updateBatch, deleteBatch } from '../api/batchService';
import PremiumCard from './ui/PremiumCard';
import api from '../api/index.js';
import { Button } from './ui/button';

interface Batch {
  id: string;
  name: string;
  department: string;
  startYear: number;
  endYear: number;
  active: boolean;
  programId?: string;
}

interface BatchFormData {
  name: string;
  department: string;
  startYear: number;
  durationInYears: number;
  active: boolean;
  programId?: string;
}

interface BatchListProps {
  onBatchChange?: () => void;
}

const BatchList: React.FC<BatchListProps> = ({ onBatchChange }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Array<{id:string;name:string;code:string}>>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<Batch | null>(null);

  const [formData, setFormData] = useState<BatchFormData>({
    name: '',
    department: '',
    programId: '',
    startYear: new Date().getFullYear(),
    durationInYears: 4,
    active: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBatches();
    api.get('/programs').then(response => setPrograms(response.data)).catch(() => setError('Unable to load programmes. Add a school and programme first.'));
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllBatches();
      setBatches(response);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError('Failed to load academic sessions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: type === 'number' ? parseInt(value) || 0 : value });
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      name: '',
      department: '',
    programId: '',
      startYear: new Date().getFullYear(),
      durationInYears: 4,
      active: true
    });
    setCurrentBatch(null);
    setIsModalOpen(true);
  };

  const openEditModal = (batch: Batch) => {
    setModalMode('edit');
    setFormData({
      name: batch.name,
      department: batch.department,
      programId: batch.programId || '',
      startYear: batch.startYear,
      durationInYears: batch.endYear - batch.startYear,
      active: batch.active
    });
    setCurrentBatch(batch);
    setIsModalOpen(true);
  };

  const openDeleteModal = (batch: Batch) => {
    setBatchToDelete(batch);
    setIsDeleteModalOpen(true);
  };

  const closeModals = () => {
    setIsModalOpen(false);
    setIsDeleteModalOpen(false);
    setBatchToDelete(null);
    setCurrentBatch(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!formData.programId) { setError('Select a programme for this academic session.'); setIsSubmitting(false); return; }
      const payload = {
        ...formData,
        department: programs.find(program => program.id === formData.programId)?.name || formData.department,
        startYear: Number(formData.startYear),
        durationInYears: Number(formData.durationInYears),
        endYear: Number(formData.startYear) + Number(formData.durationInYears)
      };

      if (modalMode === 'add') {
        await createBatch(payload);
      } else if (modalMode === 'edit' && currentBatch) {
        await updateBatch(currentBatch.id, payload);
      }
      
      closeModals();
      fetchBatches();
      if (onBatchChange) onBatchChange();
    } catch (err: any) {
      console.error('Error submitting batch:', err);
      alert(err.response?.data?.message || 'Failed to save program details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!batchToDelete) return;
    setIsSubmitting(true);
    
    try {
      await deleteBatch(batchToDelete.id);
      closeModals();
      fetchBatches();
      if (onBatchChange) onBatchChange();
    } catch (err: any) {
      console.error('Error deleting batch:', err);
      alert(err.response?.data?.message || 'Failed to delete program.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Academic Sessions</h2>
          <p className="text-muted-foreground font-sans mt-1 text-sm">
            Manage academic batches (e.g. 2024-2028).
          </p>
        </div>
        <Button onClick={openAddModal} className="shrink-0 flex items-center gap-2">
          <Plus size={16} />
          <span>Add Session</span>
        </Button>
      </div>

      <PremiumCard className="overflow-hidden p-0">
        <div className="p-4 border-b border-border/50 bg-secondary/20 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search sessions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">ID</th>
                <th className="px-6 py-4 font-medium tracking-wider">Name</th>
                <th className="px-6 py-4 font-medium tracking-wider">Department</th>
                <th className="px-6 py-4 font-medium tracking-wider">Duration</th>
                <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <p className="mt-2 text-sm">Loading academic sessions...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-destructive">
                    {error}
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No academic sessions found. Click 'Add Session' to create one.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{batch.id}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{batch.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{batch.department}</td>
                    <td className="px-6 py-4 text-muted-foreground">{batch.startYear} - {batch.endYear}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        batch.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {batch.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(batch)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(batch)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-md animate-fade-in flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">
                {modalMode === 'add' ? 'Add New Academic Session' : 'Edit Academic Session'}
              </h3>
              <button 
                onClick={closeModals}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Session Identifier (ID)</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., BTech CS 2024"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="session-program">Programme</label>
                <select id="session-program" name="programId" value={formData.programId || ''} onChange={handleInputChange} required className="w-full px-3 py-2 bg-background border border-input rounded-md">
                  <option value="">Select a programme</option>{programs.map(program => <option key={program.id} value={program.id}>{program.name} · {program.code}</option>)}
                </select>
                {programs.length === 0 && <p className="text-xs text-muted-foreground">Create a school and programme before adding a session.</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Year</label>
                  <input
                    type="number"
                    name="startYear"
                    value={formData.startYear}
                    onChange={handleInputChange}
                    required
                    min={2000}
                    max={2100}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (Years)</label>
                  <input
                    type="number"
                    name="durationInYears"
                    value={formData.durationInYears}
                    onChange={handleInputChange}
                    required
                    min={1}
                    max={10}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {modalMode === 'add' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      This will automatically generate {formData.durationInYears * 2} semesters.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active-status"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="active-status" className="text-sm font-medium cursor-pointer">
                  Session is Active
                </label>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-secondary/10">
              <Button variant="outline" onClick={closeModals} type="button">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : modalMode === 'add' ? 'Create Session' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm animate-fade-in flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-destructive">Delete Academic Session</h3>
              <button 
                onClick={closeModals}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="px-6 py-6">
              <p className="text-sm text-foreground">
                Are you sure you want to delete the academic session <span className="font-bold">{batchToDelete.name}</span>?
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This action cannot be undone and may affect associated students and subjects.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-secondary/10">
              <Button variant="outline" onClick={closeModals} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? 'Deleting...' : 'Delete Program'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchList;
