import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/Auth/AuthContext';

const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>; // Show loading while checking auth state
  }

  return user ? <Outlet /> : <Navigate to='/' />;
};

export default PrivateRoute;
