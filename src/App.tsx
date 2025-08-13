import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { theme } from './theme';
import LandingPage from './pages/LandingPage';
import GetStarted from './pages/GetStarted';
import TeacherPortal from './pages/TeacherPortal';
import StudentPortal from './pages/StudentPortal';
import AdminPortal from './pages/AdminPortal';
import Login from './pages/Login';
import AuthListener from './components/AuthListener';
import AuthPersistenceHandler from './components/AuthPersistenceHandler';
import config from './config/environment';
import { useAuth } from './context/AuthContext';

function AppContent() {
  const { loading } = useAuth();

  // Show loading spinner while auth is initializing
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Box>Loading Evalis...</Box>
      </Box>
    );
  }

  return (
    <>
      {config.IS_FRONTEND_ONLY && (
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1100 }}>
          <Alert severity="info" sx={{ borderRadius: 0 }}>
            🚀 Demo Mode: Frontend-only deployment. Backend API features are disabled.
          </Alert>
        </Box>
      )}
      <Router>
        <AuthListener />
        <AuthPersistenceHandler />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/login" element={<Login />} />
          <Route path="/teacher" element={<TeacherPortal />} />
          <Route path="/student" element={<StudentPortal />} />
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
