import React, { useState } from 'react';
import axios from 'axios';
import { Calculator } from 'lucide-react';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';
import config from '../../config/environment';

const getAuthConfig = () => {
  const token = localStorage.getItem(config.AUTH.TOKEN_STORAGE_KEY);
  return { headers: { Authorization: token ? `Bearer ${token}` : '' } };
};

const CoordinatorGrades = () => {
  const [studentId, setStudentId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const calculateSgpa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post(
        `${config.API_BASE_URL}/grades/calculate-sgpa`,
        { studentId, semesterId },
        getAuthConfig()
      );
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to calculate SGPA');
      setResult(null);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Grade Calculations (SGPA)</h2>
          <p className="text-muted-foreground font-sans mt-1 text-sm">
            Calculate SGPA based on subject credits and grade points for a semester.
          </p>
        </div>
      </div>

      <PremiumCard className="max-w-xl">
        <form onSubmit={calculateSgpa} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Student ID (UUID or Roll No)</label>
            <input 
              type="text" 
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Semester ID</label>
            <input 
              type="text" 
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
              required
            />
          </div>
          <Button type="submit" className="flex items-center gap-2">
            <Calculator size={16} /> Calculate SGPA
          </Button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}

        {result && (
          <div className="mt-8 p-6 bg-secondary/50 rounded-lg border border-border">
            <h3 className="text-lg font-semibold mb-4">Calculation Result</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Student ID:</span>
                <p className="font-medium">{result.studentId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Semester:</span>
                <p className="font-medium">{result.semesterId}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Credits:</span>
                <p className="font-medium">{result.totalCredits}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Points:</span>
                <p className="font-medium">{result.totalCreditPoints}</p>
              </div>
              <div className="col-span-2 pt-4 border-t border-border">
                <span className="text-muted-foreground">Calculated SGPA:</span>
                <p className="font-serif text-3xl font-bold text-primary mt-1">{result.sgpa}</p>
              </div>
            </div>
          </div>
        )}
      </PremiumCard>
    </div>
  );
};

export default CoordinatorGrades;
