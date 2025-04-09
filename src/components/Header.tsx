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

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

export default function Header({ title = 'Bennett University', showBackButton = true }: HeaderProps) {
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