import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config/environment';

export const ProgramManagement = () => {
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [roleToPropose, setRoleToPropose] = useState('hod');
  const [comments, setComments] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    // Fetch teachers and departments
    const fetchData = async () => {
      try {
        const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
        const headers = { Authorization: `Bearer ${token}` };
        
        const tRes = await axios.get(`${config.API_BASE_URL}/teachers`, { headers });
        setTeachers(tRes.data.data || tRes.data || []);
        
        const dRes = await axios.get(`${config.API_BASE_URL}/departments`, { headers });
        setDepartments(dRes.data.data || dRes.data || []);
      } catch (err) {
        console.error("Failed to fetch data for program management", err);
      }
    };
    fetchData();
  }, []);

  const handlePropose = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      await axios.post(`${config.API_BASE_URL}/role-requests`, {
        targetUserId: selectedTeacher,
        requestedRole: roleToPropose,
        departmentId: selectedDept,
        comments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusMsg('Role proposal submitted successfully!');
      setSelectedTeacher('');
      setComments('');
    } catch (err) {
      setStatusMsg(axios.isAxiosError(err) ? err.response?.data?.message || 'Error submitting proposal' : 'Error submitting proposal');
    }
  };

  return (
    <div className="p-6 bg-card rounded-lg border shadow-sm">
      <h2 className="text-xl font-bold mb-4">Propose HOD / Senior HOD</h2>
      <p className="text-muted-foreground mb-6">Select a teacher and department to propose for a leadership role.</p>
      
      {statusMsg && <div className="p-3 mb-4 rounded bg-primary/20 text-primary-foreground">{statusMsg}</div>}
      
      <form onSubmit={handlePropose} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Teacher</label>
          <select 
            className="w-full p-2 border rounded bg-background" 
            value={selectedTeacher} 
            onChange={e => setSelectedTeacher(e.target.value)}
            required
          >
            <option value="">Select a teacher...</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select 
            className="w-full p-2 border rounded bg-background" 
            value={roleToPropose} 
            onChange={e => setRoleToPropose(e.target.value)}
          >
            <option value="hod">HOD</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <select 
            className="w-full p-2 border rounded bg-background" 
            value={selectedDept} 
            onChange={e => setSelectedDept(e.target.value)}
            required
          >
            <option value="">Select department...</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Comments/Justification</label>
          <textarea 
            className="w-full p-2 border rounded bg-background" 
            rows={3}
            value={comments}
            onChange={e => setComments(e.target.value)}
          ></textarea>
        </div>
        
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded font-medium">
          Submit Proposal
        </button>
      </form>
    </div>
  );
};
