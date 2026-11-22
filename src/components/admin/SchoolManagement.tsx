import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config/environment';
import { Plus, Trash2, Building, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import PremiumCard from '../ui/PremiumCard';

export const SchoolManagement = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', code: '' });
  const [formError, setFormError] = useState('');

  const fetchSchools = async () => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      console.log('Fetching from API_BASE_URL:', config.API_BASE_URL);
      const response = await axios.get(`${config.API_BASE_URL}/schools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchools(response.data || []);
      setLoading(false);
    } catch (err: any) {
      console.error('Fetch Schools Error:', err);
      setError(`Failed to fetch schools: ${err.message || 'Network error'}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      await axios.post(`${config.API_BASE_URL}/schools`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setForm({ name: '', code: '' });
      fetchSchools();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create school');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school?')) return;
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      await axios.delete(`${config.API_BASE_URL}/schools/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSchools();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete school');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-serif">Manage Schools</h2>
          <p className="text-muted-foreground text-sm">Create and manage top-level university schools.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus size={16} /> Add School
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Loading schools...</div>
      ) : schools.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-lg">
          No schools found. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schools.map(school => (
            <PremiumCard key={school.id} className="relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary">
                  <Building size={24} />
                </div>
                <button
                  onClick={() => handleDelete(school.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete School"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{school.code}</p>
                <h3 className="font-serif text-xl font-bold mt-1">{school.name}</h3>
              </div>
            </PremiumCard>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-serif text-lg font-bold">Add New School</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{formError}</div>}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">School Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. School of Engineering"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">School Code</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SOE"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-1 focus:ring-primary outline-none uppercase"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create School'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
