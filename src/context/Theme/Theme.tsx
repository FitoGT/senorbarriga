import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7478ff', light: '#a6a9ff', dark: '#585ee5', contrastText: '#0d1030' },
    secondary: { main: '#a8afbd' },
    success: { main: '#45d98a' },
    info: { main: '#66aeff' },
    background: { default: '#14151a', paper: '#1e2027' },
    text: { primary: '#eceef3', secondary: '#98a0ae' },
    divider: '#2e323b',
  },
  typography: {
    fontFamily: '"Nunito", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.025em' },
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 800, letterSpacing: '-0.01em' },
    button: { fontWeight: 800, textTransform: 'none' },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'radial-gradient(1100px 560px at 12% -12%, #202432 0%, #14151a 62%)',
          backgroundAttachment: 'fixed',
        },
        '::selection': { background: 'rgba(116,120,255,.3)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { minHeight: 44, borderRadius: 999, paddingInline: 22 },
        containedPrimary: {
          background: 'linear-gradient(140deg,#a6a9ff,#7478ff)',
          boxShadow: '0 8px 22px rgba(116,120,255,.24)',
        },
      },
    },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none', borderRadius: 22, boxShadow: '0 12px 30px rgba(0,0,0,.28)' },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 50,
          borderRadius: 16,
          background: '#171920',
          '& fieldset': { borderColor: '#2e323b' },
          '&:hover fieldset': { borderColor: '#454a56' },
          '&.Mui-focused fieldset': { borderColor: '#7478ff' },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: '20px !important',
          overflow: 'hidden',
          boxShadow: '0 8px 22px rgba(0,0,0,.22)',
          '&:before': { display: 'none' },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 700 } } },
  },
});
