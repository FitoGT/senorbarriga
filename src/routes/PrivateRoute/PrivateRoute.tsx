import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/Auth/AuthContext';
import Navbar from '../../components/Navbar/Navbar';
import { Box } from '@mui/material';

const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to='/' />;
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 5 }}>
      <Navbar />
      <Outlet />
    </Box>
  );
};

export default PrivateRoute;
