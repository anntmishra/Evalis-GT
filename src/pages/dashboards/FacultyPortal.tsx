import WorkspaceOverview from '../../components/shared/WorkspaceOverview';
import WorkspaceGuard from '../../components/WorkspaceGuard';
import { getWorkspaceCatalog } from '../../api/workspaceService';
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AcademicDashboardLayout from '../../components/layout/AcademicDashboardLayout';
import config from '../../config/environment';

// Import components for different roles
// Teacher
import TeacherDashboardOverview from './TeacherDashboard'; 
// HOD
import HodDashboardOverview from './HodDashboard';
// Coordinator
import CoordinatorDashboardOverview from './CoordinatorDashboard';
import { ProgramManagement } from '../../components/faculty/ProgramManagement';
import { DeansDesk } from '../../components/faculty/DeansDesk';
import { CurriculumCommittee } from '../../components/faculty/CurriculumCommittee';
import { useAuth } from '../../hooks/useAuth';

// Teacher Components
import TeacherAssignmentManager from '../../components/TeacherAssignmentManager';
import TeacherQuestionPaperCreator from '../../components/TeacherQuestionPaperCreator';
import TeacherQuizManager from '../../components/TeacherQuizManager';
import QuestionPaperApprovals from '../../components/shared/QuestionPaperApprovals';

// HOD Components
import HodStaffManager from '../../components/hod/HodStaffManager';
import BatchList from '../../components/BatchList';
import StudentList from '../../components/StudentList';
import TeacherList from '../../components/TeacherList';

// Coordinator Components
import CoordinatorGrades from '../../components/coordinator/CoordinatorGrades';
import CoordinatorStudents from '../../components/coordinator/CoordinatorStudents';
import CoordinatorGroups from '../../components/coordinator/CoordinatorGroups';


const FacultyPortal = () => {
  const { currentUser } = useAuth();
  const [role, setRole] = useState<string>('teacher');
  const location = useLocation();
  const [catalog, setCatalog] = useState<{subjects: Array<{id: string; name: string}>; examTypes: Array<{id: string; name: string}>}>({subjects: [], examTypes: []});
  const [catalogError, setCatalogError] = useState('');
  useEffect(() => { getWorkspaceCatalog().then(setCatalog).catch(() => setCatalogError('Unable to load your subjects. Please refresh to retry.')); }, []);

  useEffect(() => {
    if (currentUser?.role) {
      setRole(currentUser.role);
    } else {
      const stored = localStorage.getItem(config.AUTH.CURRENT_USER_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setRole(parsed.role || 'teacher');
        } catch (e) {}
      }
    }
  }, [currentUser]);

  // Determine what layout role to pass so the correct sidebar items show
  // We can also create a unified 'faculty' role in AcademicDashboardLayout
  
  return (
    <AcademicDashboardLayout role="faculty">
      {catalogError && <p role="alert" className="p-4 text-red-700">{catalogError}</p>}
      <Routes>
        <Route index element={<WorkspaceOverview />} />
        <Route path="teaching" element={<WorkspaceGuard roles={['programme_coordinator']}><CoordinatorDashboardOverview /></WorkspaceGuard>} />

        {/* Faculty Extensions */}
        <Route path="programs" element={<WorkspaceGuard roles={['programme_coordinator']}><ProgramManagement /></WorkspaceGuard>} />
        <Route path="deans-desk" element={<WorkspaceGuard roles={['dean', 'assistant_dean']}><DeansDesk /></WorkspaceGuard>} />
        <Route path="curriculum" element={<WorkspaceGuard roles={['hod', 'dean', 'assistant_dean']}><CurriculumCommittee /></WorkspaceGuard>} />
        <Route path="approvals" element={<WorkspaceGuard roles={['hod', 'dean', 'assistant_dean']}><QuestionPaperApprovals /></WorkspaceGuard>} />
        
        {/* Teacher Routes */}
        <Route path="assignments" element={<TeacherAssignmentManager subjects={catalog.subjects} examTypes={catalog.examTypes} />} />
        <Route path="grading" element={<TeacherAssignmentManager subjects={catalog.subjects} examTypes={catalog.examTypes} />} />
        <Route path="questions" element={<TeacherQuestionPaperCreator subjects={catalog.subjects} examTypes={catalog.examTypes} />} />
        <Route path="quizzes" element={<TeacherQuizManager />} />
        
        {/* HOD Routes */}
        <Route path="staff" element={<WorkspaceGuard roles={['hod', 'dean', 'assistant_dean']}><HodStaffManager /></WorkspaceGuard>} />
        <Route path="programs-list" element={<BatchList />} />
        <Route path="students" element={<StudentList />} />
        <Route path="teachers" element={<TeacherList />} />
        
        {/* Coordinator Routes */}
        <Route path="grades" element={<WorkspaceGuard roles={['programme_coordinator']}><CoordinatorGrades /></WorkspaceGuard>} />
        <Route path="my-students" element={<WorkspaceGuard roles={['programme_coordinator']}><CoordinatorStudents /></WorkspaceGuard>} />
        <Route path="groups" element={<WorkspaceGuard roles={['programme_coordinator']}><CoordinatorGroups /></WorkspaceGuard>} />
      </Routes>
    </AcademicDashboardLayout>
  );
};

export default FacultyPortal;
