import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Container,
  Tab,
  Tabs,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
  useTheme,
  Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  School, 
  Person,
  Visibility,
  VisibilityOff,
  ArrowBack,
  AdminPanelSettings
} from '@mui/icons-material';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordResetForm from '../components/PasswordResetForm';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`login-tabpanel-${index}`}
      aria-labelledby={`login-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Login() {
  const [tabValue, setTabValue] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const { studentLogin, teacherLogin, adminLogin } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter all fields');
      return;
    }
    
    try {
      if (tabValue === 0) { // Student login
        try {
          await studentLogin(username, password);
          navigate('/student');
        } catch (error: any) {
          console.error('Login error:', error);
          setError(error.response?.data?.message || 'Invalid credentials. Please try again.');
        }
      } else if (tabValue === 1) { // Teacher login
        try {
          await teacherLogin(username, password);
          navigate('/teacher');
        } catch (error: any) {
          console.error('Login error:', error);
          setError(error.response?.data?.message || 'Invalid credentials. Please try again.');
        }
      } else if (tabValue === 2) { // Admin login
        try {
          await adminLogin(username, password);
          navigate('/admin');
        } catch (error: any) {
          console.error('Admin login error:', error);
          if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
            setError(error.response.data?.message || 'Invalid credentials. Please try again.');
          } else if (error.request) {
            console.error('Error request:', error.request);
            setError('Network error. Please check if the server is running.');
          } else {
            console.error('Error message:', error.message);
            setError(error.message || 'Failed to login. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred. Please try again.');
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setUsername('');
    setPassword('');
    setError('');
  };

  const handleForgotPassword = () => {
    setShowResetPassword(true);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      py: 4
    }}>
      <Header />
      
      <Container maxWidth="sm">
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </Box>

        {showResetPassword ? (
          <>
            <PasswordResetForm 
              email={tabValue === 1 ? username : ''}
              onClose={() => setShowResetPassword(false)} 
            />
          </>
        ) : (
          <Paper elevation={3} sx={{ borderRadius: 2 }}>
            <Box sx={{ 
              p: 4,
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center'
            }}>
              <Typography 
                component="h1" 
                variant="h4" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  color: theme.palette.primary.main
                }}
              >
                Welcome Back
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary" 
                align="center"
                gutterBottom
              >
                Login to access your Bennett University grading portal
              </Typography>

              <Box sx={{ width: '100%', mt: 3 }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="fullWidth"
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab 
                    icon={<Person />} 
                    label="Student" 
                    sx={{ 
                      textTransform: 'none',
                      minHeight: 64
                    }}
                  />
                  <Tab 
                    icon={<School />} 
                    label="Teacher" 
                    sx={{ 
                      textTransform: 'none',
                      minHeight: 64
                    }}
                  />
                  <Tab 
                    icon={<AdminPanelSettings />} 
                    label="Admin" 
                    sx={{ 
                      textTransform: 'none',
                      minHeight: 64
                    }}
                  />
                </Tabs>

                {error && (
                  <Alert severity="error" onClose={() => setError('')} sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}>
                  <TabPanel value={tabValue} index={0}>
                    <TextField
                      label="Student ID"
                      required
                      fullWidth
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      margin="normal"
                      placeholder="Enter your student ID (e.g., S00001)"
                      helperText="Use your student ID, not email address"
                    />
                  </TabPanel>

                  <TabPanel value={tabValue} index={1}>
                    <TextField
                      label="Email"
                      type="email"
                      required
                      fullWidth
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      margin="normal"
                    />
                  </TabPanel>

                  <TabPanel value={tabValue} index={2}>
                    <TextField
                      label="Username"
                      required
                      fullWidth
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      margin="normal"
                    />
                  </TabPanel>

                  <TextField
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    margin="normal"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    sx={{ mt: 3, mb: 2, py: 1.5 }}
                  >
                    Login as {tabValue === 0 ? 'Student' : tabValue === 1 ? 'Teacher' : 'Admin'}
                  </Button>
                </form>

                <Typography variant="body2" color="text.secondary" align="center">
                  Having trouble logging in?{' '}
                  <Link 
                    component="button" 
                    variant="body2" 
                    onClick={handleForgotPassword}
                    color="primary"
                  >
                    Reset Password
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          Need help? Contact{' '}
          <Link href="mailto:support@bennett.edu.in" color="primary">
            support@bennett.edu.in
          </Link>
        </Typography>
      </Container>
    </Box>
  );
} 