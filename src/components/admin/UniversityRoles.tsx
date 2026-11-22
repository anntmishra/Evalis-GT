import React, { useState } from 'react';
import axios from 'axios';
import config from '../../config/environment';
import { getAuthConfig } from '../../api/authUtils';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';
import { Award, User, AlertCircle, Briefcase } from 'lucide-react';

export const UniversityRoles = () => {
  const [form, setForm] = useState({ email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAssignCoe = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);
    
    try {
      await axios.post(`${config.API_BASE_URL}/hierarchy/assign-coe`, form, await getAuthConfig());
      setMessage(`Successfully assigned ${form.email} as Controller of Examinations (COE).`);
      setForm({ email: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign COE');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Global University Roles</h2>
        <p className="text-muted-foreground font-sans mt-1 text-sm max-w-2xl">
          Assign high-level global authorities such as the Controller of Examinations (COE).
        </p>
      </div>

      <div className="max-w-2xl">
        <PremiumCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Briefcase size={120} />
          </div>
          
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Award className="text-primary" /> Assign Controller of Examinations (COE)
          </h3>
          
          {message && (
            <div className="mb-6 p-4 bg-primary/10 text-primary rounded-lg border border-primary/20 text-sm flex items-start gap-2">
              <User size={16} className="mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAssignCoe} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Faculty Email</label>
              <input
                required
                type="email"
                placeholder="Enter faculty email address"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
              />
              <p className="text-xs text-muted-foreground mt-2">
                The Controller of Examinations manages university-wide grading windows, approves final results, and oversees all exam-related functions.
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || !form.email}
            >
              {isSubmitting ? 'Assigning Role...' : 'Promote to COE'}
            </Button>
          </form>
        </PremiumCard>
      </div>
    </div>
  );
};

export default UniversityRoles;
