import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/Auth/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

const Navbar = () => {
  const { logout } = useAuth();
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <>
      <AppBar
        position='static'
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: 3,
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography
            variant='h6'
            component='div'
            sx={{
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              color: theme.palette.text.primary,
            }}
          >
            Señor Barriga App
          </Typography>
          <IconButton edge='end' color='inherit' aria-label='menu' onClick={toggleDrawer(true)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer anchor='right' open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 250 }} role='presentation' onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
          <List>
            <ListItemButton onClick={() => handleNavigation(ROUTES.DASHBOARD)}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary='Dashboard' />
            </ListItemButton>

            <ListItemButton onClick={() => handleNavigation(ROUTES.EXPENSES)}>
              <ListItemIcon>
                <ReceiptIcon />
              </ListItemIcon>
              <ListItemText primary='Expenses' />
            </ListItemButton>

            <ListItemButton onClick={logout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary='Logout' />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;
