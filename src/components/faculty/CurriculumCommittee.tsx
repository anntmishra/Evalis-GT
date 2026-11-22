import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config/environment';

interface HandoutSummary {
  id: string;
  proposerId: string;
  credits: number;
  content: string;
  Subject?: { name: string; credits: number };
  Proposer?: { name: string; email: string };
  HandoutVotes?: Array<{ voterId: string }>;
}

export const CurriculumCommittee = () => {
  const [handouts, setHandouts] = useState<HandoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const fetchHandouts = async () => {
    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      const user = JSON.parse(localStorage.getItem(config.AUTH.CURRENT_USER_KEY) || '{}');
      setCurrentUserId(user.id);
      
      const response = await axios.get(`${config.API_BASE_URL}/handouts/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHandouts(response.data || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch handouts');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandouts();
  }, []);

  const handleVote = async (id: string, voteType: 'Approve' | 'Reject') => {
    const comments = prompt(`Please enter any comments for your ${voteType.toLowerCase()} vote (optional):`);
    if (comments === null) return; // User cancelled prompt

    try {
      const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
      await axios.post(`${config.API_BASE_URL}/handouts/${id}/vote`, {
        vote: voteType,
        comments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Vote recorded: ${voteType}`);
      fetchHandouts();
    } catch (err) {
      alert('Error recording vote: ' + (axios.isAxiosError(err) ? err.response?.data?.message || err.message : 'Unexpected error'));
    }
  };

  if (loading) return <div>Loading curriculum proposals...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6 bg-card rounded-lg border shadow-sm">
      <h2 className="text-xl font-bold mb-4">Curriculum Committee Voting</h2>
      <p className="text-muted-foreground mb-6">Review proposed course handouts and modifications to subject credits.</p>
      
      {handouts.length === 0 ? (
        <p className="text-muted-foreground italic">No pending course handouts to review.</p>
      ) : (
        <div className="space-y-6">
          {handouts.map(h => {
            const hasVoted = h.HandoutVotes?.some(v => v.voterId === currentUserId);
            const isProposer = h.proposerId === currentUserId;
            
            return (
              <div key={h.id} className="p-4 border rounded bg-background flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{h.Subject?.name} (Current Credits: {h.Subject?.credits})</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Proposed by: {h.Proposer?.name} ({h.Proposer?.email})
                    </p>
                  </div>
                  <div className="bg-secondary px-3 py-1 rounded font-mono text-sm">
                    Proposed Credits: <span className="font-bold text-primary">{h.credits}</span>
                  </div>
                </div>
                
                <div className="bg-secondary/30 p-3 rounded text-sm">
                  <h4 className="font-semibold mb-2">Syllabus / Content Proposal:</h4>
                  <p className="whitespace-pre-wrap">{h.content}</p>
                </div>

                <div className="flex justify-between items-center mt-2 pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Current Votes: {h.HandoutVotes?.length || 0} (Needs 2 Approvals)
                  </div>
                  <div className="flex gap-2">
                    {isProposer ? (
                      <span className="text-sm italic text-muted-foreground px-2 py-1">You proposed this</span>
                    ) : hasVoted ? (
                      <span className="text-sm italic text-green-600 px-2 py-1">Vote Recorded</span>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleVote(h.id, 'Approve')}
                          className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleVote(h.id, 'Reject')}
                          className="px-4 py-1.5 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
