import WorkspaceOverview from '../../components/shared/WorkspaceOverview';
import StudentResults from '../../components/StudentResults';
import { Routes, Route } from 'react-router-dom';
import StudentAssignmentList from '../../components/StudentAssignmentList';
import StudentQuizInterface from '../../components/StudentQuizInterface';
import React, { useEffect, useState } from 'react';
import AcademicDashboardLayout from '../../components/layout/AcademicDashboardLayout';
import PremiumCard from '../../components/ui/PremiumCard';
import { BookOpen, Award, GraduationCap, Mail, ArrowRight } from 'lucide-react';
import { getStudentProfile } from '../../api';

interface StudentProfile {
  id: string;
  name: string;
  email?: string;
  section?: string;
  batch?: string;
  cgpa?: number;
  Batch?: { id: string; name: string; Program?: { name: string; School?: { name: string } }; Department?: { name: string } };
  Specialization?: { name: string };
  subjects?: Array<{ id: string; name: string; code?: string }>;
}

const StudentDashboardOverview = () => <AcademicDashboardLayout role="student"><WorkspaceOverview /></AcademicDashboardLayout>;


const StudentDashboard = () => {
  return (
    <Routes>
      <Route index element={<StudentDashboardOverview />} />
      <Route path="assignments" element={<AcademicDashboardLayout role="student"><StudentAssignmentList /></AcademicDashboardLayout>} />
      <Route path="results" element={<AcademicDashboardLayout role="student"><StudentResults /></AcademicDashboardLayout>} />
      <Route path="quizzes" element={<AcademicDashboardLayout role="student"><StudentQuizInterface /></AcademicDashboardLayout>} />
    </Routes>
  );
};

export default StudentDashboard;
