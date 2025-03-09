import { useEffect, useState } from 'react';
import { supabase } from '../../services/Supabase/SupabaseService';
import { Income } from '../../interfaces/Income';
import { 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress, 
  Stack 
} from '@mui/material';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const Dashboard = () => {
  const [incomeData, setIncomeData] = useState<Income | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIncome = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching income:', error.message);
    } else {
      setIncomeData(data);
    }
    setLoading(false);
  };  

  useEffect(() => {
    fetchIncome();
  }, []);

  return (
    <Container maxWidth='md' sx={{ mt: 4 }}>
      {loading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">
          <Card sx={{ backgroundColor: '#e8f5e9', flex: 1, minWidth: 300, p: 2 }}>
            <CardContent>
              <Typography variant='h6' fontWeight='bold'>Kari's Income</Typography>
              <Typography variant='h3' color='primary'>€ {incomeData ? formatNumber(incomeData.kari_income) : '0,00'}</Typography>
              <Typography variant='h6' color='textSecondary'>{incomeData ? formatNumber(incomeData.kari_percentage) : '0,00'}% of total</Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#e3f2fd', flex: 1, minWidth: 300, p: 2 }}>
            <CardContent>
              <Typography variant='h6' fontWeight='bold'>Adolfo's Income</Typography>
              <Typography variant='h3' color='primary'>€ {incomeData ? formatNumber(incomeData.adolfo_income) : '0,00'}</Typography>
              <Typography variant='h6' color='textSecondary'>{incomeData ? formatNumber(incomeData.adolfo_percentage) : '0,00'}% of total</Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#f5f5f5', flex: 1, minWidth: 300, p: 2 }}>
            <CardContent>
              <Typography variant='h6' fontWeight='bold'>Total Income</Typography>
              <Typography variant='h3' color='primary'>€ {incomeData ? formatNumber(incomeData.total_income) : '0,00'}</Typography>
              <Typography variant='h6' color='textSecondary'>100,00% of total</Typography>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Container>
  );
};

export default Dashboard;
