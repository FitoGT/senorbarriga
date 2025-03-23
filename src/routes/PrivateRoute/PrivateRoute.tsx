import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/Auth/AuthContext';
import Navbar from '../../components/Navbar/Navbar';

const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to='/' />;
  }

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

export default PrivateRoute;
