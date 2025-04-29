import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Security as SecurityIcon,
  School as SchoolIconMUI,
  Grade as GradeIcon,
  Timeline as TimelineIcon,
  Login as LoginIcon,
  PlayArrow as PlayIcon,
  Person,
  Code
} from '@mui/icons-material';
import Header from '../components/Header';

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  const features = [
    {
      icon: <SchoolIconMUI sx={{ fontSize: 40 }} />,
      title: 'Smart Grading',
      description: 'Intelligent grading system with automatic CGPA calculation and performance tracking.'
    },
    {
      icon: <GradeIcon sx={{ fontSize: 40 }} />,
      title: 'Grade Analysis',
      description: 'Detailed grade distribution and performance analytics for better insights.'
    },
    {
      icon: <TimelineIcon sx={{ fontSize: 40 }} />,
      title: 'Progress Tracking',
      description: 'Visual representation of academic progress over time.'
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Secure Access',
      description: 'Role-based access control for students and teachers.'
    }
  ];

  const demoOptions = [
    {
      title: 'Student Demo',
      icon: <Person sx={{ fontSize: 40 }} />,
      description: 'Experience the student portal with demo data',
      path: '/student'
    },
    {
      title: 'Teacher Demo',
      icon: <SchoolIconMUI sx={{ fontSize: 40 }} />,
      description: 'Try out the teacher portal with sample classes',
      path: '/teacher'
    },
    {
      title: 'Developer Test',
      icon: <Code sx={{ fontSize: 40 }} />,
      description: 'Test the system with full access',
      path: '/teacher'
    }
  ];

  const handleDemoClick = (path: string) => {
    // Here you would typically set up the demo environment
    navigate(path);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(45deg, #f3f4f6 30%, #ffffff 90%)'
    }}>
      {/* Header */}
      <Header showBackButton={false} />

      {/* Action Buttons */}
      <Box sx={{ 
        position: 'absolute',
        top: 16,
        right: 24,
        zIndex: 1200,
        display: 'flex',
        gap: 2
      }}>
        <Button 
          variant="outlined" 
          onClick={() => setDemoDialogOpen(true)}
          startIcon={<PlayIcon />}
        >
          Try Demo
        </Button>
        <Button 
          variant="contained" 
          onClick={() => navigate('/login')}
          startIcon={<LoginIcon />}
        >
          Login
        </Button>
      </Box>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: 15, pb: 8 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Smart Grading System
            </Typography>
            <Typography variant="h5" color="text.secondary" paragraph>
              Transform your academic experience with our intelligent grading and performance tracking system.
            </Typography>
            <Box sx={{ mt: 4 }}>
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => navigate('/get-started')}
                startIcon={<PlayIcon />}
                sx={{ mr: 2 }}
              >
                Get Started
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                onClick={() => navigate('/login')}
                startIcon={<LoginIcon />}
              >
                Login
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box 
              component="img"
              src="/src/assets/Evalis-Logo.svg" 
              alt="Evalis"
              sx={{ 
                width: '100%',
                maxWidth: 400,
                height: 'auto',
                display: 'block',
                margin: 'auto'
              }}
            />
          </Grid>
        </Grid>
      </Container>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography 
          variant="h3" 
          component="h2" 
          align="center" 
          gutterBottom
          sx={{ mb: 6 }}
        >
          Features
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper 
                elevation={2}
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ 
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 3
                }}>
                  <Box sx={{ 
                    color: theme.palette.primary.main,
                    mb: 2
                  }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Demo Dialog */}
      <Dialog 
        open={demoDialogOpen} 
        onClose={() => setDemoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
            Choose Demo Mode
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {demoOptions.map((option, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleDemoClick(option.path)}
                >
                  <CardContent sx={{ 
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <Box sx={{ color: theme.palette.primary.main, mb: 2 }}>
                      {option.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {option.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {option.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDemoDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Call to Action */}
      <Box sx={{ 
        bgcolor: theme.palette.primary.main,
        color: 'white',
        py: 8,
        mt: 8
      }}>
        <Container maxWidth="md">
          <Typography variant="h4" align="center" gutterBottom>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" align="center" paragraph>
            Join our smart grading system today and transform your academic journey.
          </Typography>
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => navigate('/get-started')}
              sx={{ 
                bgcolor: 'white',
                color: theme.palette.primary.main,
                mr: 2,
                '&:hover': {
                  bgcolor: '#f3f4f6'
                }
              }}
            >
              Get Started
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => navigate('/login')}
              sx={{ 
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Login Now
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage; 