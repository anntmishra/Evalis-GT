import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Card,
  CardContent,
  Grid,
  useTheme
} from '@mui/material';
import {
  School,
  Person,
  Assignment,
  Analytics,
  NavigateNext,
  NavigateBefore,
  Login as LoginIcon
} from '@mui/icons-material';
import Header from '../components/Header';

const steps = [
  {
    label: 'Choose Your Role',
    description: 'Select whether you are a student or teacher at Bennett University.',
    icon: <Person />,
    content: [
      {
        title: 'Student',
        description: 'Access your grades, track progress, and view academic performance.',
        icon: <Person sx={{ fontSize: 40 }} />
      },
      {
        title: 'Teacher',
        description: 'Manage grades, check submissions, and analyze class performance.',
        icon: <School sx={{ fontSize: 40 }} />
      }
    ]
  },
  {
    label: 'Access Features',
    description: 'Explore the key features available in the grading system.',
    icon: <Assignment />,
    content: [
      {
        title: 'Grade Management',
        description: 'Enter and manage grades with automatic CGPA calculation.',
        icon: <Assignment sx={{ fontSize: 40 }} />
      },
      {
        title: 'Performance Analytics',
        description: 'View detailed analytics and progress tracking.',
        icon: <Analytics sx={{ fontSize: 40 }} />
      }
    ]
  },
  {
    label: 'Get Started',
    description: 'Login to your account or try the demo to explore the system.',
    icon: <LoginIcon />,
    content: [
      {
        title: 'Login Now',
        description: 'Access your account with your Bennett University credentials.',
        icon: <LoginIcon sx={{ fontSize: 40 }} />
      },
      {
        title: 'Try Demo',
        description: 'Explore the system with sample data before getting started.',
        icon: <School sx={{ fontSize: 40 }} />
      }
    ]
  }
];

export default function GetStarted() {
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();
  const navigate = useNavigate();

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default'
    }}>
      <Header />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            align="center"
            sx={{ 
              fontWeight: 'bold',
              color: theme.palette.primary.main,
              mb: 4
            }}
          >
            Get Started with Smart Grading
          </Typography>

          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((step) => (
              <Step key={step.label}>
                <StepLabel StepIconComponent={() => (
                  <Box sx={{ 
                    color: activeStep >= steps.indexOf(step) ? theme.palette.primary.main : theme.palette.grey[400]
                  }}>
                    {step.icon}
                  </Box>
                )}>
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 4 }}>
            <Typography 
              variant="h5" 
              gutterBottom 
              align="center"
              color="text.secondary"
            >
              {steps[activeStep].description}
            </Typography>

            <Grid container spacing={4} sx={{ mt: 2 }}>
              {steps[activeStep].content.map((item, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card 
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
                      p: 4
                    }}>
                      <Box sx={{ 
                        color: theme.palette.primary.main,
                        mb: 2
                      }}>
                        {item.icon}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {item.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {item.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mt: 4,
              pt: 2,
              borderTop: 1,
              borderColor: 'divider'
            }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                startIcon={<NavigateBefore />}
              >
                Back
              </Button>
              <Box>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleLogin}
                    startIcon={<LoginIcon />}
                  >
                    Login Now
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    endIcon={<NavigateNext />}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
} 