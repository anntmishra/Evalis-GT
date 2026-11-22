import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config/environment';
import { Users, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import PremiumCard from '../ui/PremiumCard';

interface RoleRequestSummary {
  id: string;
  requestedRole: string;
  comments?: string;
  TargetUser?: { name: string };
  Proposer?: { name: string };
}

export const DeansDesk = () => {
  const [requests, setRequests] = useState<RoleRequestSummary[]>([]);
  const [facultyCount, setFacultyCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      const response = await axios.get(`${config.API_BASE_URL}/role-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch role requests');
      setLoading(false);
    }
  };

  const fetchFacultyCount = async () => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      const response = await axios.get(`${config.API_BASE_URL}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(response.data) ? response.data : response.data?.teachers || [];
      setFacultyCount(list.length);
    } catch (err) {
      setFacultyCount(null);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchFacultyCount();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      await axios.put(`${config.API_BASE_URL}/role-requests/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests(); // refresh list
    } catch (err) {
      alert('Error updating request: ' + (axios.isAxiosError(err) ? err.response?.data?.message || err.message : 'Unexpected error'));
    }
  };

  if (loading) return <div>Loading requests...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Dean's Overview</h1>
        <p className="text-muted-foreground font-sans mt-2 max-w-2xl text-lg">
          Monitor school-wide performance, faculty workload, and review pending leadership proposals.
        </p>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <PremiumCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Faculty</p>
            <h2 className="font-serif text-2xl font-bold">{facultyCount ?? '—'}</h2>
          </div>
        </PremiumCard>
        
        <PremiumCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Pass Rate</p>
            <h2 className="font-serif text-2xl font-bold text-muted-foreground">Coming soon</h2>
          </div>
        </PremiumCard>

        <PremiumCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg SGPA</p>
            <h2 className="font-serif text-2xl font-bold text-muted-foreground">Coming soon</h2>
          </div>
        </PremiumCard>

        <PremiumCard className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Roles</p>
            <h2 className="font-serif text-2xl font-bold text-destructive">{requests.length}</h2>
          </div>
        </PremiumCard>
      </div>

      {/* Role Approvals Section */}
      <div className="p-6 bg-card rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold mb-4">Leadership Role Approvals</h2>
        <p className="text-muted-foreground mb-6">Review pending HOD and leadership role proposals from Programme Coordinators.</p>
      
      {requests.length === 0 ? (
        <p className="text-muted-foreground italic">No pending requests to review.</p>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="p-4 border rounded bg-background flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">Proposing: {req.TargetUser?.name || 'Unknown'} for {req.requestedRole}</h3>
                  <p className="text-sm text-muted-foreground">Proposed by: {req.Proposer?.name || 'Unknown'}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAction(req.id, 'approve')}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleAction(req.id, 'reject')}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
              {req.comments && (
                <div className="text-sm bg-secondary/50 p-2 rounded mt-2">
                  <strong>Comments:</strong> {req.comments}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};
