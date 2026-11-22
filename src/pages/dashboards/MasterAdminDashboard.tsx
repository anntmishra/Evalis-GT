import WorkspaceOverview from '../../components/shared/WorkspaceOverview';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AcademicDashboardLayout from '../../components/layout/AcademicDashboardLayout';
import { CurriculumBuilder } from '../../components/admin/CurriculumBuilder';
import { SchoolManagement } from '../../components/admin/SchoolManagement';
import { AuditLogs } from '../../components/admin/AuditLogs';
import { DeanManagement } from '../../components/admin/DeanManagement';
import { BulkImport } from '../../components/admin/BulkImport';
import { ProgramManagement } from '../../components/admin/ProgramManagement';
import { UniversityRoles } from '../../components/admin/UniversityRoles';
import BatchList from '../../components/BatchList';

const MasterAdminOverview = () => <AcademicDashboardLayout role="master_admin"><WorkspaceOverview /></AcademicDashboardLayout>;

const MasterAdminDashboard = () => {
  return (
    <Routes>
      <Route index element={<MasterAdminOverview />} />
      <Route path="schools" element={<AcademicDashboardLayout role="master_admin"><SchoolManagement /></AcademicDashboardLayout>} />
      <Route path="curriculum-admin" element={<AcademicDashboardLayout role="master_admin"><CurriculumBuilder /></AcademicDashboardLayout>} />
      <Route path="programs" element={<AcademicDashboardLayout role="master_admin"><ProgramManagement /></AcademicDashboardLayout>} />
      <Route path="batches" element={<AcademicDashboardLayout role="master_admin"><BatchList /></AcademicDashboardLayout>} />
      <Route path="dean-management" element={<AcademicDashboardLayout role="master_admin"><DeanManagement /></AcademicDashboardLayout>} />
      <Route path="global-roles" element={<AcademicDashboardLayout role="master_admin"><UniversityRoles /></AcademicDashboardLayout>} />
      <Route path="bulk-import" element={<AcademicDashboardLayout role="master_admin"><BulkImport /></AcademicDashboardLayout>} />
      <Route path="audit-logs" element={<AcademicDashboardLayout role="master_admin"><AuditLogs /></AcademicDashboardLayout>} />
    </Routes>
  );
};

export default MasterAdminDashboard;
