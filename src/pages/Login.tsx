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
import config from '../config/environment';

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
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter all fields');
      return;
    }
    
    try {
      if (tabValue === 0) { // Student login
        try {
          const response = await fetch(config.API_ENDPOINTS.AUTH.STUDENT_LOGIN, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: username, password }),
          });
          
          if (!response.ok) {
            throw new Error('Invalid credentials');
          }
          
          const data = await response.json();
          
          // Store token and user info
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, data.token);
          localStorage.setItem(config.AUTH.USER_STORAGE_KEY, JSON.stringify(data));
          localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify({ 
            id: username, 
            name: data.name,
            role: 'student' 
          }));
          
          navigate('/student');
          return;
        } catch (error) {
          console.error('Login error:', error);
          setError('Invalid credentials. Please try again.');
        }
      } else if (tabValue === 1) { // Teacher login
        try {
          const response = await fetch(config.API_ENDPOINTS.AUTH.TEACHER_LOGIN, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: username, password }),
          });
          
          if (!response.ok) {
            throw new Error('Invalid credentials');
          }
          
          const data = await response.json();
          
          // Store token and user info
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, data.token);
          localStorage.setItem(config.AUTH.USER_STORAGE_KEY, JSON.stringify(data));
          localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify({ 
            id: username, 
            name: data.name,
            role: 'teacher' 
          }));
          
          navigate('/teacher');
          return;
        } catch (error) {
          console.error('Login error:', error);
          setError('Invalid credentials. Please try again.');
        }
      } else if (tabValue === 2) { // Admin login
        try {
          console.log('Attempting admin login with username:', username);
          
          const response = await fetch(config.API_ENDPOINTS.AUTH.ADMIN_LOGIN, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Admin login failed:', response.status, errorData);
            throw new Error(errorData?.message || 'Invalid credentials');
          }
          
          const data = await response.json();
          console.log('Admin login successful:', data);
          
          // Store token and user info
          localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, data.token);
          localStorage.setItem(config.AUTH.USER_STORAGE_KEY, JSON.stringify(data));
          localStorage.setItem(config.AUTH.CURRENT_USER_KEY, JSON.stringify({ 
            id: username, 
            name: data.name,
            role: 'admin' 
          }));
          
          navigate('/admin');
          return;
        } catch (error) {
          console.error('Login error:', error);
          setError('Invalid credentials. Please try again.');
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
                <Alert 
                  severity="error" 
                  sx={{ mt: 2, width: '100%' }}
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              )}

              <TabPanel value={tabValue} index={0}>
                <Box component="form" sx={{ mt: 1 }}>
                  <TextField
                    required
                    fullWidth
                    id="student-id"
                    label="Student ID"
                    name="studentId"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2, py: 1.5 }}
                    onClick={handleLogin}
                  >
                    Login as Student
                  </Button>
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box component="form" sx={{ mt: 1 }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="teacher-id"
                    label="Teacher ID"
                    name="teacherId"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    id="teacher-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2, py: 1.5 }}
                    onClick={handleLogin}
                  >
                    Login as Teacher
                  </Button>
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Box component="form" sx={{ mt: 1 }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="admin-username"
                    label="Admin Username"
                    name="adminUsername"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    id="admin-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
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
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2, py: 1.5 }}
                    onClick={handleLogin}
                  >
                    Sign In as Admin
                  </Button>
                </Box>
              </TabPanel>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Demo Student Credentials:
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  Student ID: E23CSE001, Password: anant123
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  Student ID: E23CSE002, Password: kushagra123
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} gutterBottom>
                  Demo Teacher Credentials:
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  Teacher ID: T12345, Password: teacher123
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

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