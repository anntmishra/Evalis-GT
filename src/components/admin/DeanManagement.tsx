import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config/environment';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';
import { Award, User, AlertCircle } from 'lucide-react';

export const DeanManagement = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({ schoolId: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
        const response = await axios.get(`${config.API_BASE_URL}/schools`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSchools(response.data || []);
      } catch (err) {
        console.error('Failed to fetch schools');
      } finally {
        setLoading(false);
      }
    };
    fetchSchools();
  }, []);

  const handleAssignDean = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      await axios.post(`${config.API_BASE_URL}/hierarchy/assign-dean`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(`Successfully assigned ${form.email} as Dean.`);
      setForm({ schoolId: '', email: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign Dean');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <PremiumCard title="Assign Dean" subtitle="Elevate a user to Dean for a specific School">
        <form onSubmit={handleAssignDean} className="space-y-4 mt-4">
          {message && <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">{message}</div>}
          {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md flex items-center gap-2 text-sm"><AlertCircle size={16}/> {error}</div>}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Select School</label>
            <select
              required
              value={form.schoolId}
              onChange={e => setForm({ ...form, schoolId: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">-- Choose a School --</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dean's Email Address</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="dean@evalis.edu"
                className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-md focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">They will receive Dean permissions across all departments under this school.</p>
          </div>

          <Button type="submit" disabled={isSubmitting || loading} className="w-full mt-2">
            {isSubmitting ? 'Assigning...' : 'Assign Dean Role'}
          </Button>
        </form>
      </PremiumCard>

      <PremiumCard className="bg-secondary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Award size={24} />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold">The Dean's Authority</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              When a user is elevated to Dean, they gain absolute oversight over all Departments within their School. 
            </p>
            <ul className="text-sm text-muted-foreground mt-4 space-y-2 list-disc pl-4">
              <li>Approve or reject HOD appointments.</li>
              <li>Final say on Curriculum Committee structural changes.</li>
              <li>Monitor passing rates and SGPA analytics.</li>
            </ul>
          </div>
        </div>
      </PremiumCard>
    </div>
  );
};
