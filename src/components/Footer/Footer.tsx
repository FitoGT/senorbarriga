import { AppBar, useTheme } from '@mui/material';
import ExchangeRateCard from '../ExchangeRateCard/ExchangeRateCard';

export default function Footer() {
  const theme = useTheme();

  return (
    <AppBar
      position='fixed'
      color='default'
      sx={{
        top: 'auto',
        bottom: 0,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        boxShadow: 3,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <ExchangeRateCard />
    </AppBar>
  );
}
