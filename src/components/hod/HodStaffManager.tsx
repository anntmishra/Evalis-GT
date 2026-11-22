import React, { useState, useEffect } from 'react';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';
import { UserPlus, Users, X } from 'lucide-react';
import { assignCoordinator } from '../../api/hierarchyService';
import { getAllBatches } from '../../api/batchService';

const HodStaffManager = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Assignment modal state
  const [assignModal, setAssignModal] = useState<{ open: boolean; batchId: string; batchName: string }>({
    open: false, batchId: '', batchName: ''
  });
  const [coordinatorEmail, setCoordinatorEmail] = useState('');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await getAllBatches();
      // getAllBatches returns array directly (not wrapped in .data)
      const data = Array.isArray(response) ? response : (response as any)?.data || [];
      setBatches(data);
    } catch (err) {
      console.error('Failed to load batches', err);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = (batch: any) => {
    setCoordinatorEmail('');
    setAssignModal({ open: true, batchId: batch.id, batchName: batch.name });
  };

  const handleAssignCoordinator = async () => {
    if (!coordinatorEmail.trim()) return;
    setAssigning(assignModal.batchId);
    try {
      await assignCoordinator(assignModal.batchId, coordinatorEmail.trim());
      setAssignModal({ open: false, batchId: '', batchName: '' });
      alert(`Coordinator role assigned to ${coordinatorEmail} successfully!`);
    } catch (err: any) {
      alert(`Failed to assign Coordinator: ${err.response?.data?.message || err.message}`);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Staff & Coordinator Management</h2>
        <p className="text-muted-foreground font-sans mt-1 text-sm">
          Oversee your department's batches and assign Academic Coordinators to manage them.
        </p>
      </div>

      <PremiumCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Batch Name</th>
                <th className="px-6 py-4 font-medium tracking-wider">Year Range</th>
                <th className="px-6 py-4 font-medium tracking-wider">Department</th>
                <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                <th className="px-6 py-4 font-medium tracking-wider">Coordinator</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground animate-pulse">Loading batches...</td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={32} className="text-muted-foreground/50" />
                      <p>No batches found. Create programs first.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{batch.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{batch.startYear} – {batch.endYear}</td>
                    <td className="px-6 py-4 text-muted-foreground">{batch.department || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                        batch.active ? 'text-green-600 bg-green-500/10' : 'text-amber-600 bg-amber-500/10'
                      }`}>
                        {batch.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground font-medium">
                      {batch.Coordinators && batch.Coordinators.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {batch.Coordinators[0].userId}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openAssignModal(batch)}
                        disabled={assigning === batch.id}
                        className="flex items-center gap-2"
                      >
                        <UserPlus size={16} />
                        {assigning === batch.id ? 'Assigning...' : (batch.Coordinators && batch.Coordinators.length > 0 ? 'Change Coordinator' : 'Assign Coordinator')}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      {/* Assign Coordinator Modal */}
      {assignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm animate-fade-in">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">Assign Coordinator</h3>
              <button
                onClick={() => setAssignModal({ open: false, batchId: '', batchName: '' })}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Assign an Academic Coordinator to manage{' '}
                <span className="font-medium text-foreground">{assignModal.batchName}</span>.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Coordinator Email Address</label>
                <input
                  type="email"
                  value={coordinatorEmail}
                  onChange={e => setCoordinatorEmail(e.target.value)}
                  placeholder="coordinator@university.edu"
                  className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAssignModal({ open: false, batchId: '', batchName: '' })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignCoordinator}
                  disabled={!coordinatorEmail.trim() || !!assigning}
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodStaffManager;
