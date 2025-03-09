import { useEffect, useState } from 'react';
import { useAuth } from '../../context/Auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/Supabase/SupabaseService';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncome = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('income').select('*');
    console.log(data)
    if (error) {
      console.error('Error fetching income:', error.message);
    } else {
      setIncomeData(data || []);
    }
    setLoading(false);
  };  

  useEffect(() => {
    fetchIncome();
  }, []);

  return (
    <div>
      <h2>Welcome, {user?.email}</h2>
      <button
        onClick={() => {
          logout();
          navigate('/');
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
