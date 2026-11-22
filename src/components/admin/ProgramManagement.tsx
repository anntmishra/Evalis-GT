import React, { useState, useEffect } from 'react';
import { BookOpen, Building2, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import config from '../../config/environment';
import { getAuthConfig } from '../../api/authUtils';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';

export const ProgramManagement: React.FC = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', code: '', description: '' });

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchPrograms(selectedSchool);
    } else {
      setPrograms([]);
    }
  }, [selectedSchool]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config.API_BASE_URL}/schools`, await getAuthConfig());
      setSchools(res.data);
      if (res.data.length > 0) {
        setSelectedSchool(res.data[0].id);
      }
    } catch (err: any) {
      setError('Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async (schoolId: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${config.API_BASE_URL}/programs?schoolId=${schoolId}`, await getAuthConfig());
      setPrograms(res.data);
    } catch (err: any) {
      setError('Failed to fetch programs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await axios.post(`${config.API_BASE_URL}/programs`, {
        ...formData,
        schoolId: selectedSchool
      }, await getAuthConfig());
      setPrograms([...programs, res.data]);
      setIsModalOpen(false);
      setFormData({ id: '', name: '', code: '', description: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create program');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this program?')) return;
    try {
      await axios.delete(`${config.API_BASE_URL}/programs/${id}`, await getAuthConfig());
      setPrograms(programs.filter(p => p.id !== id));
    } catch (err: any) {
      setError('Failed to delete program');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Program Management</h2>
          <p className="text-muted-foreground font-sans mt-1 text-sm">
            Create academic programs (e.g. BTech CS) under specific schools.
          </p>
        </div>
        <Button onClick={() => {
          setFormData({ id: '', name: '', code: '', description: '' });
          setIsModalOpen(true);
        }} className="gap-2" disabled={!selectedSchool}>
          <Plus size={16} /> New Program
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg border border-destructive/20 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar - School Selection */}
        <div className="md:col-span-1 space-y-4">
          <PremiumCard>
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 size={16} /> Select School
            </h3>
            <div className="space-y-2">
              {schools.map(school => (
                <button
                  key={school.id}
                  onClick={() => setSelectedSchool(school.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                    selectedSchool === school.id 
                      ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                      : 'hover:bg-secondary/50 text-foreground'
                  }`}
                >
                  <div className="font-bold">{school.code}</div>
                  <div className="text-xs opacity-80 truncate">{school.name}</div>
                </button>
              ))}
              {schools.length === 0 && !loading && (
                <div className="text-sm text-muted-foreground italic p-2">No schools exist yet.</div>
              )}
            </div>
          </PremiumCard>
        </div>

        {/* Right Content - Programs */}
        <div className="md:col-span-3">
          <PremiumCard className="min-h-[500px]">
            {!selectedSchool ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                <BookOpen size={48} className="mb-4 opacity-20" />
                <p>Select a school to view its programs</p>
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : programs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                <BookOpen size={48} className="mb-4 opacity-20" />
                <p>No programs found for this school.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>
                  Create First Program
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {programs.map((prog) => (
                  <div key={prog.id} className="border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-colors bg-background flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg text-foreground">{prog.name}</h4>
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                          {prog.code}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                        {prog.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive ml-auto" onClick={() => handleDelete(prog.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PremiumCard>
        </div>
      </div>

      {/* Create Program Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/30">
              <h3 className="text-lg font-bold">Create New Program</h3>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Program Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Bachelor of Technology in Computer Science"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Program Code</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. BTECH-CS"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50"
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50"
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Program'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProgramManagement;
