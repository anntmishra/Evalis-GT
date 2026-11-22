import { Routes, Route } from 'react-router-dom';
import TeacherAssignmentManager from '../../components/TeacherAssignmentManager';
import TeacherQuestionPaperCreator from '../../components/TeacherQuestionPaperCreator';
import TeacherQuizManager from '../../components/TeacherQuizManager';
import React, { useEffect, useState } from 'react';
import AcademicDashboardLayout from '../../components/layout/AcademicDashboardLayout';
import PremiumCard from '../../components/ui/PremiumCard';
import { BookOpen, Users, Clock, ArrowRight } from 'lucide-react';
import api from '../../api'; // Make sure the path to your axios instance is correct
import { getStudentsByTeacher, getTeacherSubmissions } from '../../api/teacherService';

const TeacherDashboardOverview = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalStudents: 0, pendingGrades: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [assignmentsRes, studentsRes, submissionsRes] = await Promise.all([
          api.get('/teaching-assignments/me'),
          getStudentsByTeacher(),
          getTeacherSubmissions()
        ]);

        if (Array.isArray(assignmentsRes.data)) {
          setAssignments(assignmentsRes.data);
        } else {
          setError('Failed to fetch teaching assignments.');
        }

        const students = studentsRes?.data?.data || studentsRes?.data || [];
        const submissions = submissionsRes?.data?.data || submissionsRes?.data || [];
        
        setStats({
          totalStudents: students.length || 0,
          pendingGrades: submissions.filter((s: any) => !s.graded).length || 0
        });

      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load schedule.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
      <div className="space-y-8">
        
        {/* Header Section */}
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">Welcome back, Professor</h1>
          <p className="text-muted-foreground font-sans mt-2 max-w-2xl text-lg">
            Here is your active teaching schedule for the current semester. Select a class to manage grading and submissions.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PremiumCard className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Classes</p>
              <h2 className="font-serif text-2xl font-bold">{loading ? '-' : assignments.length}</h2>
            </div>
          </PremiumCard>

          <PremiumCard className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Students</p>
              <h2 className="font-serif text-2xl font-bold">{loading ? '-' : stats.totalStudents}</h2>
            </div>
          </PremiumCard>

          <PremiumCard className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Grades</p>
              <h2 className="font-serif text-2xl font-bold text-destructive">{loading ? '-' : stats.pendingGrades}</h2>
            </div>
          </PremiumCard>
        </div>

        {/* Classes Grid */}
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground mb-6">Your Schedule</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-card rounded-xl border border-border"></div>
              ))}
            </div>
          ) : error ? (
            <PremiumCard>
              <p className="text-destructive font-medium">{error}</p>
            </PremiumCard>
          ) : assignments.length === 0 ? (
            <PremiumCard>
              <div className="text-center py-12">
                <BookOpen size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="font-serif text-xl font-medium">No Active Assignments</h3>
                <p className="text-muted-foreground mt-2">You have not been assigned to any sections for this semester.</p>
              </div>
            </PremiumCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {assignments.map((assignment) => (
                <PremiumCard key={assignment.id} className="group cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground capitalize border border-border">
                      {assignment.sessionType}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium bg-background border border-border px-2 py-1 rounded">
                      Section {assignment.Section?.name}
                    </span>
                  </div>
                  
                  <h3 className="font-serif text-xl font-bold text-foreground mb-1 line-clamp-1">
                    {assignment.Subject?.name || 'Unknown Subject'}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono mb-6">
                    {assignment.Subject?.code || 'NO-CODE'} • {assignment.Subject?.Semester?.name || 'Current Sem'}
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
                    <span className="text-sm font-medium text-foreground group-hover:underline decoration-1 underline-offset-4">
                      Manage Grades
                    </span>
                    <ArrowRight size={18} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </div>
                </PremiumCard>
              ))}
            </div>
          )}
        </div>
      </div>
  );
};


const TeacherDashboard = () => {
  return (
    <Routes>
      <Route index element={<TeacherDashboardOverview />} />
      <Route path="assignments" element={<AcademicDashboardLayout role="teacher"><TeacherAssignmentManager subjects={[]} examTypes={[]} /></AcademicDashboardLayout>} />
      <Route path="grading" element={<AcademicDashboardLayout role="teacher"><TeacherAssignmentManager subjects={[]} examTypes={[]} /></AcademicDashboardLayout>} />
      <Route path="questions" element={<AcademicDashboardLayout role="teacher"><TeacherQuestionPaperCreator subjects={[]} examTypes={[]} /></AcademicDashboardLayout>} />
      <Route path="quizzes" element={<AcademicDashboardLayout role="teacher"><TeacherQuizManager /></AcademicDashboardLayout>} />
    </Routes>
  );
};

export default TeacherDashboard;
