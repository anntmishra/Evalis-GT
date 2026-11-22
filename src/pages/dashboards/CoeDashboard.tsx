import WorkspaceOverview from '../../components/shared/WorkspaceOverview';
import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AcademicDashboardLayout from '../../components/layout/AcademicDashboardLayout';
import PremiumCard from '../../components/ui/PremiumCard';
import { BookOpen, FileText, CheckCircle } from 'lucide-react';
import { getCoeStats } from '../../api/coeService';

import CoeResultsManager from '../../components/coe/CoeResultsManager';
import CoeExamApprovals from '../../components/coe/CoeExamApprovals';
import CoeDepartmentManager from '../../components/coe/CoeDepartmentManager';
import CoeSchoolManager from '../../components/coe/CoeSchoolManager';
import CoeImports from '../../components/coe/CoeImports';

const CoeDashboardOverview = () => <AcademicDashboardLayout role="coe"><WorkspaceOverview /></AcademicDashboardLayout>;

const CoeDashboard = () => {
  return (
    <Routes>
      <Route index element={<CoeDashboardOverview />} />
      <Route path="schools" element={<AcademicDashboardLayout role="coe"><CoeSchoolManager /></AcademicDashboardLayout>} />
      <Route path="departments" element={<AcademicDashboardLayout role="coe"><CoeDepartmentManager /></AcademicDashboardLayout>} />
      <Route path="results" element={<AcademicDashboardLayout role="coe"><CoeResultsManager /></AcademicDashboardLayout>} />
      <Route path="approvals" element={<AcademicDashboardLayout role="coe"><CoeExamApprovals /></AcademicDashboardLayout>} />
      <Route path="imports" element={<AcademicDashboardLayout role="coe"><CoeImports /></AcademicDashboardLayout>} />
    </Routes>
  );
};

export default CoeDashboard;
