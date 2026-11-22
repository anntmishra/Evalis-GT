import { LOCAL_AUTH } from './context/DevelopmentAuth';
import DevelopmentSignIn from './pages/DevelopmentSignIn';
import WorkspaceGuard, { WorkspaceHome } from './components/WorkspaceGuard';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './theme';
import LandingPage from './pages/LandingPage';
import GetStarted from './pages/GetStarted';
import Login from './pages/Login';
import ClerkPortalSignIn from './pages/ClerkPortalSignIn';
import AuthListener from './components/AuthListener';
import AuthPersistenceHandler from './components/AuthPersistenceHandler';

// Import token refresh interceptor
import './api/tokenRefresh';
import './api/sessionManager';
import ClerkAuthBridge from './components/ClerkAuthBridge';

// Import new isolated auth pages
import TeacherSignUp from './pages/TeacherSignUp';
import StudentSignUp from './pages/StudentSignUp';

import FacultyPortal from './pages/dashboards/FacultyPortal';
import StudentDashboard from './pages/dashboards/StudentDashboard';
import CoeDashboard from './pages/dashboards/CoeDashboard';
import MasterAdminDashboard from './pages/dashboards/MasterAdminDashboard';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthListener />
        <AuthPersistenceHandler />
        {!LOCAL_AUTH && <ClerkAuthBridge />}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/get-started" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={LOCAL_AUTH ? <DevelopmentSignIn /> : <Login />} />
          <Route path="/workspace" element={<WorkspaceHome />} />
          
          {/* Admin Routes */}
          <Route path="/coe/sign-in/*" element={LOCAL_AUTH ? <DevelopmentSignIn /> : <ClerkPortalSignIn entry="admin" />} />
          <Route path="/master-admin/sign-in/*" element={LOCAL_AUTH ? <DevelopmentSignIn /> : <ClerkPortalSignIn entry="admin" />} />
          <Route path="/admin/sign-in/*" element={LOCAL_AUTH ? <DevelopmentSignIn /> : <ClerkPortalSignIn entry="admin" />} />
          <Route path="/admin/sign-up/*" element={<Navigate to="/admin/sign-in" replace />} />
          <Route path="/admin" element={<Navigate to="/dashboard/coe" replace />} />
          
          {/* Teacher Routes */}
          <Route path="/teacher/sign-in/*" element={LOCAL_AUTH ? <DevelopmentSignIn /> : <ClerkPortalSignIn entry="teacher" />} />
          <Route path="/teacher/sign-up/*" element={LOCAL_AUTH ? <DevelopmentSignIn /> : <TeacherSignUp />} />
          <Route path="/teacher" element={<Navigate to="/dashboard/faculty" replace />} />
          
          {/* Student Routes */}
          <Route path="/student/sign-in/*" element={LOCAL_AUTH ? <DevelopmentSignIn /> : <ClerkPortalSignIn entry="student" />} />
          <Route path="/student/sign-up/*" element={LOCAL_AUTH ? <DevelopmentSignIn /> : <StudentSignUp />} />
          <Route path="/student" element={<Navigate to="/dashboard/student" replace />} />

          {/* New Hierarchy Dashboards (Minimalist Monochrome Hybrid) */}
          <Route path="/dashboard/faculty/*" element={<WorkspaceGuard roles={['teacher','hod','dean','assistant_dean','programme_coordinator']}><FacultyPortal /></WorkspaceGuard>} />
          <Route path="/dashboard/student/*" element={<WorkspaceGuard roles={['student']}><StudentDashboard /></WorkspaceGuard>} />
          <Route path="/dashboard/coe/*" element={<WorkspaceGuard roles={['coe','admin']}><CoeDashboard /></WorkspaceGuard>} />
          <Route path="/dashboard/master-admin/*" element={<WorkspaceGuard roles={['admin','master_admin']}><MasterAdminDashboard /></WorkspaceGuard>} />
          
          {/* Fallback redirects */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
