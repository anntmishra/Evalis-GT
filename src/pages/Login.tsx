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
import UserSignup from '../components/UserSignup';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export default function Login() {
  const [tabValue, setTabValue] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const { login } = useAuth();

  const handleLogin = async () => {
    // Trim whitespace from username/email to prevent formatting issues
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setError('Please enter all fields');
      return;
    }
    
    try {
      setError(''); // Clear any previous errors
      console.log('Attempting login with:', { username: trimmedUsername, tab: tabValue });
      
      const userData = await login(trimmedUsername, password);
      console.log('Login successful:', userData.role);
      
      // Check if there's a saved redirect path from session storage
      const redirectPath = sessionStorage.getItem('auth:redirectPath');
      
      // Clear auth-related session storage
      sessionStorage.removeItem('auth:redirectPath');
      sessionStorage.removeItem('auth:error');
      sessionStorage.removeItem('auth:errorTime');
      
      // Navigate based on redirect path or user role
      if (redirectPath) {
        console.log('Redirecting to saved path:', redirectPath);
        navigate(redirectPath);
      } else {
        // Default navigation based on user role
        if (userData.role === 'student') {
          navigate('/student');
        } else if (userData.role === 'teacher') {
          navigate('/teacher');
        } else if (userData.role === 'admin') {
          navigate('/admin');
        } else {
          setError('Invalid user role');
        }
      }
    } catch (error: any) {
      console.error('Login error in component:', error);
      
      // Show more specific error messages based on error code
      if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        setError(error.message || 'Invalid email or password. Please check your credentials and try again.');
      }
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

  const handleForgotPassword = () => {
    setShowResetPassword(true);
  };

  const handleSignup = () => {
    setShowSignup(true);
  };

  const handleSignupSuccess = () => {
    setShowSignup(false);
    setError('');
    // Optional: Show success message
  };

  if (showSignup) {
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
              onClick={() => setShowSignup(false)}
            >
              Back to Login
            </Button>
          </Box>
          <UserSignup 
            onSuccess={handleSignupSuccess}
            onCancel={() => setShowSignup(false)}
          />
        </Container>
      </Box>
    );
  }

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
                Login to access your Evalis grading portal
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
                      label="Student ID or Email"
                      required
                      fullWidth
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      margin="normal"
                      placeholder="Enter your student ID (e.g., S00001) or email"
                      helperText="Use your student ID or email address"
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
                      label="Username or Email"
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

                <Box sx={{ 
                  mt: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1
                }}>
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
                  
                  {tabValue === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">
                      Don't have an account?{' '}
                      <Link 
                        component="button" 
                        variant="body2" 
                        onClick={handleSignup}
                        color="primary"
                      >
                        Sign up
                      </Link>
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
} 