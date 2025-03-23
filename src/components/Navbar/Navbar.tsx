import { AppBar, Toolbar, Typography, IconButton, Box, useTheme } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/Auth/AuthContext';

const Navbar = () => {
  const { logout } = useAuth();
  const theme = useTheme();

  return (
    <AppBar 
      position='static' 
      sx={{ 
        backgroundColor: theme.palette.background.paper, 
        color: theme.palette.text.primary, 
        boxShadow: 3 
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography 
          variant='h6' 
          component='div' 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 'bold', 
            whiteSpace: 'nowrap',
            color: theme.palette.text.primary 
          }}
        >
          Señor Barriga App
        </Typography>
        <Box>
          <IconButton 
            onClick={logout} 
            sx={{ color: theme.palette.text.primary }}
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
