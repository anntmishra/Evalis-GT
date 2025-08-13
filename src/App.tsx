import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Alert, Box } from '@mui/material';
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
}

export default App;
