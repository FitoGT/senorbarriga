import { AppBar, Toolbar, Typography, IconButton, Box, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/Auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';
import { toFixedString } from '../../utils/number';

const Navbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: exchangeRate } = useGetCurrentExchangeRate();
  const tabs = [
    { label: 'Today', path: ROUTES.DASHBOARD },
    { label: 'Expenses', path: ROUTES.EXPENSES },
    { label: 'Savings', path: ROUTES.SAVINGS },
    { label: 'Income', path: ROUTES.INCOME },
    { label: 'Debt', path: ROUTES.DEBT },
  ];

  return (
    <AppBar position='sticky' elevation={0} sx={{ bgcolor: 'rgba(20,21,26,.9)', backdropFilter: 'blur(14px)' }}>
      <Toolbar sx={{ minHeight: '64px !important', gap: 1.25, px: { xs: 2, sm: 2.25 }, flexWrap: 'wrap', py: 1 }}>
        <Box display='flex' alignItems='center' gap={1.25} flexShrink={0}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(140deg,#a6a9ff,#7478ff)',
              color: '#0d1030',
              fontWeight: 800,
            }}
          >
            B
          </Box>
          <Typography fontWeight={800} whiteSpace='nowrap'>
            Señor Barriga
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            p: 0.5,
            bgcolor: '#1e2027',
            borderRadius: 999,
            order: { xs: 3, sm: 0 },
            flex: { xs: '1 0 100%', sm: '0 1 auto' },
            mt: { xs: 0.5, sm: 0 },
          }}
        >
          {tabs.map((tab) => {
            const active =
              tab.path === ROUTES.DASHBOARD ? location.pathname === tab.path : location.pathname.startsWith(tab.path);
            return (
              <Button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                color='inherit'
                sx={{
                  minHeight: 40,
                  px: { xs: 1, sm: 2.25 },
                  flex: { xs: 1, sm: 'none' },
                  color: active ? 'text.primary' : 'text.secondary',
                  bgcolor: active ? '#31353f' : 'transparent',
                  '&:hover': { bgcolor: active ? '#363b46' : '#292c34' },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
        <Typography
          variant='caption'
          sx={{ ml: 'auto', color: 'text.secondary', fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          €1.00 = ${exchangeRate?.USD ? toFixedString(exchangeRate.USD) : '—'}
        </Typography>
        <IconButton onClick={logout} aria-label='Logout' title='Logout' sx={{ color: 'text.secondary' }}>
          <LogoutIcon fontSize='small' />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
