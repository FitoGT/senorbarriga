import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider, darkTheme, NotificationsProvider } from './context';
import Auth from './components/Auth/Auth';
import Dashboard from './components/Dashboard/Dashboard';
import Expenses from './components/Expenses/Expenses';
import Expense from './components/Expense/Expense';
import PrivateRoute from './routes/PrivateRoute/PrivateRoute';

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <NotificationsProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path='/' element={<Auth />} />
                <Route element={<PrivateRoute />}>
                  <Route path='/dashboard' element={<Dashboard />} />
                  <Route path='/expenses' element={<Expenses />} />
                  <Route path='/expense/:id?' element={<Expense />} />
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
