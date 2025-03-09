import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/Auth/AuthContext';

const Navbar = () => {
const { logout } = useAuth();

  return (
    <AppBar position='static' color='primary'>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography 
          variant='h6' 
          component='div' 
          sx={{ flexGrow: 1, fontWeight: 'bold', whiteSpace: 'nowrap' }}
        >
          Señor Barriga App
        </Typography>

        <Box>
          <IconButton color='inherit' onClick={logout}>
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
