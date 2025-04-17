import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, darkTheme, NotificationsProvider } from './context';
import Auth from './components/Auth/Auth';
import Dashboard from './components/Dashboard/Dashboard';
import Expenses from './components/Expenses/Expenses';
import Expense from './components/Expense/Expense';
import PrivateRoute from './routes/PrivateRoute/PrivateRoute';
import { ROUTES } from './constants/routes';

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <NotificationsProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path='*' element={<Navigate to={ROUTES.AUTH} replace />} />

                <Route path={ROUTES.AUTH} element={<Auth />} />
                <Route element={<PrivateRoute />}>
                  <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
                  <Route path={ROUTES.EXPENSES} element={<Expenses />} />
                  <Route path={ROUTES.EXPENSES + ':id?'} element={<Expense />} />
                </Route>
              </Routes>
            </Router>
          </AuthProvider>
        </NotificationsProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
