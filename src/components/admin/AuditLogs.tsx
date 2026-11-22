import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config/environment';
import PremiumCard from '../ui/PremiumCard';
import { ShieldAlert, Info, AlertTriangle } from 'lucide-react';

export const AuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY) || '';
        const response = await axios.get(`${config.API_BASE_URL}/admin-tools/logs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(response.data || []);
      } catch (e) {
        console.error('Failed to fetch logs:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const getLogIcon = (level: string) => {
    switch(level) {
      case 'error': return <ShieldAlert className="text-destructive" size={16} />;
      case 'warn': return <AlertTriangle className="text-yellow-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  return (
    <PremiumCard title="System Audit Logs" subtitle="Tracking critical university-wide actions">
      {loading ? (
        <div className="text-center py-8 text-muted-foreground animate-pulse">Loading secure logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No recent critical logs found.</div>
      ) : (
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Level</th>
                <th className="px-6 py-4 font-medium tracking-wider">Timestamp</th>
                <th className="px-6 py-4 font-medium tracking-wider w-full">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 font-mono uppercase text-xs font-semibold">
                      {getLogIcon(log.level)}
                      {log.level}
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-muted-foreground font-mono text-xs">
                    {log.timestamp}
                  </td>
                  <td className="px-6 py-3 font-medium font-sans">
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PremiumCard>
  );
};
