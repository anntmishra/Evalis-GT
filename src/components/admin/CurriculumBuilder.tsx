import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, ChevronDown, ChevronRight, Plus, Save } from 'lucide-react';
import { getAllBatches } from '../../api/batchService';
import { getAllSemesters, Semester } from '../../api/semesterService';
import { getAllSubjects, createSubject } from '../../api/subjectService';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';

export const CurriculumBuilder: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [expandedSemester, setExpandedSemester] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // New Subject Form State
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState({
    id: '',
    name: '',
    section: 'A',
    credits: 3,
    type: 'Core'
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [batchesRes, semestersRes, subjectsRes] = await Promise.all([
        getAllBatches(),
        getAllSemesters(),
        getAllSubjects()
      ]);
      setBatches(batchesRes);
      setSemesters(semestersRes);
      setSubjects(subjectsRes);
      if (batchesRes.length > 0) {
        setSelectedBatch(batchesRes[0].id);
      }
    } catch (err) {
      console.error('Error fetching curriculum data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (semesterId: string) => {
    try {
      if (!newSubject.id || !newSubject.name) return alert('ID and Name required');
      
      const payload = {
        ...newSubject,
        semesterId,
        batchId: selectedBatch
      };
      
      const created = await createSubject(payload);
      setSubjects([...subjects, created]);
      setShowAddForm(null);
      setNewSubject({ id: '', name: '', section: 'A', credits: 3, type: 'Core' });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating subject');
    }
  };

  // Filter data for selected batch
  const batchSemesters = semesters
    .filter(s => s.batchId === selectedBatch)
    .sort((a, b) => a.number - b.number);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Curriculum Builder</h2>
          <p className="text-muted-foreground font-sans mt-1 text-sm">
            Map subjects and credits to automatically generated semesters.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar - Batch Selection */}
        <div className="md:col-span-1 space-y-4">
          <PremiumCard>
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-4">Select Academic Session</h3>
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : batches.map(batch => (
                <button
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                    selectedBatch === batch.id 
                      ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                      : 'hover:bg-secondary/50 text-foreground'
                  }`}
                >
                  {batch.name}
                </button>
              ))}
            </div>
          </PremiumCard>
        </div>

        {/* Right Content - Semesters & Subjects */}
        <div className="md:col-span-3">
          <PremiumCard className="min-h-[500px]">
            {!selectedBatch ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <BookOpen size={48} className="mb-4 opacity-20" />
                <p>Select an academic session (batch) to view its curriculum</p>
              </div>
            ) : batchSemesters.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                <Calendar size={48} className="mb-4 opacity-20" />
                <p>No semesters found for this academic session.</p>
                <p className="text-sm mt-2">Recreate the batch to auto-generate semesters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">Academic Curriculum Timeline</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                    {batchSemesters.length} Semesters
                  </span>
                </div>
                
                {batchSemesters.map((sem) => {
                  const isExpanded = expandedSemester === sem.id;
                  const semSubjects = subjects.filter(sub => sub.semesterId === sem.id);
                  const totalCredits = semSubjects.reduce((sum, sub) => sum + (Number(sub.credits) || 0), 0);
                  
                  return (
                    <div key={sem.id} className="border border-border/50 rounded-xl overflow-hidden transition-all bg-background">
                      {/* Semester Header */}
                      <button 
                        onClick={() => setExpandedSemester(isExpanded ? null : sem.id)}
                        className={`w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors ${isExpanded ? 'bg-secondary/20 border-b border-border/50' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          {isExpanded ? <ChevronDown size={20} className="text-muted-foreground" /> : <ChevronRight size={20} className="text-muted-foreground" />}
                          <div className="text-left">
                            <h4 className="font-bold text-foreground">{sem.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(sem.startDate).toLocaleDateString()} - {new Date(sem.endDate).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><Clock size={12}/> {totalCredits} Credits</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-md">{semSubjects.length} Subjects</span>
                        </div>
                      </button>

                      {/* Semester Content */}
                      {isExpanded && (
                        <div className="p-4 bg-secondary/5">
                          {semSubjects.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                              {semSubjects.map(sub => (
                                <div key={sub.id} className="bg-background border border-border p-3 rounded-lg shadow-sm">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h5 className="font-bold text-sm text-primary">{sub.name}</h5>
                                      <p className="text-xs text-muted-foreground font-mono mt-1">{sub.id}</p>
                                    </div>
                                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                                      {sub.credits} CR
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic mb-4">No subjects assigned to this semester yet.</p>
                          )}

                          {/* Add Subject Inline Form */}
                          {showAddForm === sem.id ? (
                            <div className="bg-background border border-primary/20 p-4 rounded-lg space-y-3">
                              <h5 className="text-sm font-bold">Add Subject to {sem.name}</h5>
                              <div className="grid grid-cols-2 gap-3">
                                <input 
                                  placeholder="Subject Code (e.g. CS101)" 
                                  className="text-sm px-3 py-2 border border-input rounded focus:ring-1 focus:ring-primary"
                                  value={newSubject.id} onChange={e => setNewSubject({...newSubject, id: e.target.value})}
                                />
                                <input 
                                  placeholder="Subject Name" 
                                  className="text-sm px-3 py-2 border border-input rounded focus:ring-1 focus:ring-primary"
                                  value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                                />
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-muted-foreground">Credits:</label>
                                  <input 
                                    type="number" min="1" max="10" 
                                    className="text-sm px-2 py-1 border border-input rounded w-16 focus:ring-1 focus:ring-primary"
                                    value={newSubject.credits} onChange={e => setNewSubject({...newSubject, credits: parseInt(e.target.value)})}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" size="sm" onClick={() => setShowAddForm(null)}>Cancel</Button>
                                <Button size="sm" onClick={() => handleAddSubject(sem.id)} className="gap-1"><Save size={14}/> Save Subject</Button>
                              </div>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full border-dashed gap-2"
                              onClick={() => {
                                setShowAddForm(sem.id);
                                setNewSubject({ id: '', name: '', section: 'A', credits: 3, type: 'Core' });
                              }}
                            >
                              <Plus size={14} /> Add Subject
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </PremiumCard>
        </div>
      </div>
    </div>
  );
};

export default CurriculumBuilder;
