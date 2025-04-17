import { useEffect, useState } from 'react';
import { Container, Stack } from '@mui/material';
import IncomeCard from './IncomeCard';
import FullLoader from '../Loader/FullLoader';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Income } from '../../interfaces';
import { useNotifications } from '../../context';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const Dashboard = () => {
  const { showNotification } = useNotifications();
  const [incomeData, setIncomeData] = useState<Income | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<'kari' | 'adolfo' | null>(null);
  const [tempValue, setTempValue] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [latestIncome] = await Promise.all([supabaseService.getLatestIncome()]);
      setIncomeData(latestIncome);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification(`Error fetching data: ${error}`, 'error');
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setEditing(null);
    setTempValue(null);
  };

  const handleSave = async () => {
    if (!editing || tempValue === null) return;
    const newValue = parseFloat(tempValue.replace(',', '.'));
    try {
      await supabaseService.updateIncome(editing, newValue);
      const latestIncome = await supabaseService.getLatestIncome();
      setIncomeData(latestIncome);
      showNotification('Income updated', 'success');
    } catch (error) {
      console.error('Error updating income:', error);
      showNotification(`Error updating income ${error}`, 'error');
    }
    setEditing(null);
    setTempValue(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9,]/g, '');
    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) {
      return;
    }
    setTempValue(value);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Container maxWidth='md' sx={{ mt: 4 }}>
      {loading ? (
        <FullLoader />
      ) : (
        <>
          <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent='center'>
            <IncomeCard
              title="Kari's Income"
              amount={incomeData ? formatNumber(incomeData.kari_income) : '0,00'}
              percentage={incomeData ? formatNumber(incomeData.kari_percentage) : '0,00'}
              color='success'
              editing={editing === 'kari'}
              onEdit={() => {
                setEditing('kari');
                setTempValue(incomeData ? incomeData.kari_income.toString().replace('.', ',') : '');
              }}
              onSave={handleSave}
              onCancel={handleCancel}
              onChange={handleInputChange}
              tempValue={tempValue}
            />
            <IncomeCard
              title="Adolfo's Income"
              amount={incomeData ? formatNumber(incomeData.adolfo_income) : '0,00'}
              percentage={incomeData ? formatNumber(incomeData.adolfo_percentage) : '0,00'}
              color='info'
              editing={editing === 'adolfo'}
              onEdit={() => {
                setEditing('adolfo');
                setTempValue(incomeData ? incomeData.adolfo_income.toString().replace('.', ',') : '');
              }}
              onSave={handleSave}
              onCancel={handleCancel}
              onChange={handleInputChange}
              tempValue={tempValue}
            />
            <IncomeCard
              title='Total Income'
              amount={incomeData ? formatNumber(incomeData.total_income) : '0,00'}
              percentage='100,00'
              color='primary'
            />
          </Stack>
        </>
      )}
    </Container>
  );
};

export default Dashboard;
