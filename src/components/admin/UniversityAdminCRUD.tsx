import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config/environment';
import { Pencil, Save, Plus, Trash2, X } from 'lucide-react';

interface SemesterSummary { id: string; name: string; startDate: string; endDate: string; }
interface SubjectSummary { id: string; name: string; type: string; credits: number; }

export const UniversityAdminCRUD = () => {
  const [semesters, setSemesters] = useState<SemesterSummary[]>([]);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<SemesterSummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  
  // State for editing
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState('');
  
  // State for new Semester
  const [newSemName, setNewSemName] = useState('');
  const [newSemStart, setNewSemStart] = useState('');
  const [newSemEnd, setNewSemEnd] = useState('');

  const fetchSemesters = async () => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      const response = await axios.get(`${config.API_BASE_URL}/semesters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSemesters(response.data.data || response.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching semesters:', err);
      setLoading(false);
    }
  };

  const fetchSubjectsForSemester = async (semId: string) => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      const response = await axios.get(`${config.API_BASE_URL}/subjects?semesterId=${semId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(response.data.data || response.data || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  const handleCreateSemester = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      await axios.post(`${config.API_BASE_URL}/semesters`, {
        name: newSemName,
        startDate: newSemStart,
        endDate: newSemEnd
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setNewSemName('');
      setNewSemStart('');
      setNewSemEnd('');
      fetchSemesters();
    } catch (err) {
      alert('Error creating semester');
    }
  };

  const handleUpdateCredits = async (subjectId: string) => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      await axios.put(`${config.API_BASE_URL}/subjects/${subjectId}`, {
        credits: parseInt(editCredits, 10)
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setEditingSubject(null);
      if (selectedSemester) {
        fetchSubjectsForSemester(selectedSemester.id);
      }
    } catch (err) {
      alert('Error updating credits');
    }
  };

  if (loading) return <div>Loading Admin Data...</div>;

  return (
    <div className="p-6 bg-card rounded-lg border shadow-sm">
      <h2 className="text-xl font-bold mb-4">University Curriculum Admin</h2>
      <p className="text-muted-foreground mb-6">Manage Semesters and Subject Credits</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Semesters List */}
        <div className="border rounded bg-background flex flex-col">
          <div className="p-3 border-b bg-secondary/50 font-bold flex justify-between items-center">
            Semesters
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {semesters.map(s => (
              <div 
                key={s.id} 
                onClick={() => {
                  setSelectedSemester(s);
                  fetchSubjectsForSemester(s.id);
                }}
                className={`p-3 border-b cursor-pointer hover:bg-secondary/30 transition-colors ${selectedSemester?.id === s.id ? 'bg-primary/10 border-primary/30' : ''}`}
              >
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(s.startDate).toLocaleDateString()} - {new Date(s.endDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t bg-secondary/20">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Plus size={14}/> Add Semester</h4>
            <form onSubmit={handleCreateSemester} className="flex flex-col gap-2">
              <input type="text" placeholder="Name (e.g. Fall 2026)" value={newSemName} onChange={e=>setNewSemName(e.target.value)} className="w-full text-sm p-1 border rounded" required />
              <div className="flex gap-2">
                <input type="date" value={newSemStart} onChange={e=>setNewSemStart(e.target.value)} className="w-full text-sm p-1 border rounded" required />
                <input type="date" value={newSemEnd} onChange={e=>setNewSemEnd(e.target.value)} className="w-full text-sm p-1 border rounded" required />
              </div>
              <button type="submit" className="bg-primary text-primary-foreground text-xs p-1.5 rounded">Create</button>
            </form>
          </div>
        </div>

        {/* Subjects List */}
        <div className="md:col-span-2 border rounded bg-background flex flex-col">
          <div className="p-3 border-b bg-secondary/50 font-bold">
            {selectedSemester ? `Subjects in ${selectedSemester.name}` : 'Select a Semester to view Subjects'}
          </div>
          <div className="flex-1 p-4">
            {!selectedSemester ? (
              <div className="h-full flex items-center justify-center text-muted-foreground italic">
                No semester selected
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-muted-foreground italic">No subjects found for this semester.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">Subject Name</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Credits</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(sub => (
                    <tr key={sub.id} className="border-b">
                      <td className="py-2 font-medium">{sub.name} <span className="text-xs text-muted-foreground ml-1">({sub.id})</span></td>
                      <td className="py-2 text-sm">{sub.type}</td>
                      <td className="py-2">
                        {editingSubject === sub.id ? (
                          <input 
                            type="number" 
                            className="w-16 p-1 border rounded" 
                            value={editCredits} 
                            onChange={e => setEditCredits(e.target.value)}
                            min="1" max="10"
                          />
                        ) : (
                          <span className="inline-block px-2 py-1 bg-secondary rounded font-mono text-sm">{sub.credits}</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        {editingSubject === sub.id ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleUpdateCredits(sub.id)} className="text-green-600 hover:text-green-800"><Save size={18}/></button>
                            <button onClick={() => setEditingSubject(null)} className="text-red-600 hover:text-red-800"><X size={18}/></button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => { setEditingSubject(sub.id); setEditCredits(sub.credits.toString()); }}
                            className="text-primary hover:text-primary/80"
                          >
                            <Pencil size={18}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
