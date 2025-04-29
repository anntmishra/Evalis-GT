import { 
  Typography, 
  Button, 
  Box,
  useTheme
} from '@mui/material';
import { 
  Login as LoginIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import evalisLogo from '../assets/Evalis-Logo.svg';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export default function Header({ title = 'Evalis', showBackButton = true }: HeaderProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  return (
    <Box sx={{ 
      py: 2, 
      px: 3, 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      bgcolor: 'white',
      borderBottom: 1,
      borderColor: 'divider',
      position: 'sticky',
      top: 0,
      zIndex: 1100
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {showBackButton && !isHomePage && (
          <Button
            startIcon={<LoginIcon />}
            onClick={() => navigate('/')}
            sx={{ 
              color: theme.palette.text.secondary,
              '&:hover': {
                color: theme.palette.primary.main
              }
            }}
          >
            Back to Home
          </Button>
        )}
        <Box
          component="img"
          src={evalisLogo}
          alt="Evalis"
          sx={{ 
            height: 40,
            mr: 1 
          }}
        />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 'bold',
            color: theme.palette.primary.main,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );
} 