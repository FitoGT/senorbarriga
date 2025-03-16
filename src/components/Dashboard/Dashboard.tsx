import { useEffect, useState } from 'react';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Income } from '../../interfaces/Income';
import { Expense } from '../../interfaces/Expenses'; 
import { Container, CircularProgress, Stack } from '@mui/material';
import IncomeCard from './IncomeCard';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const Dashboard = () => {
  const [incomeData, setIncomeData] = useState<Income | null>(null);
  const [expensesData, setExpensesData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<'kari' | 'adolfo' | null>(null);
  const [tempValue, setTempValue] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [latestIncome, allExpenses] = await Promise.all([
          supabaseService.getLatestIncome(),
          supabaseService.getAllExpenses(),
        ]);

        setIncomeData(latestIncome);
        setExpensesData(allExpenses);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleEditClick = (person: 'kari' | 'adolfo') => {
    setEditing(person);
    const value = person === 'kari' ? incomeData?.kari_income ?? 0 : incomeData?.adolfo_income ?? 0;
    setTempValue(formatNumber(value));
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
    } catch (error) {
      console.error('Error updating income:', error);
    }

    setEditing(null);
    setTempValue(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9,]/g, '');

    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) return;

    setTempValue(value);
  };

  console.log('Fetched Expenses:', expensesData);

  return (
    <Container maxWidth='md' sx={{ mt: 4 }}>
      {loading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">
          <IncomeCard
            title="Kari's Income"
            amount={incomeData ? formatNumber(incomeData.kari_income) : '0,00'}
            percentage={incomeData ? formatNumber(incomeData.kari_percentage) : '0,00'}
            editing={editing === 'kari'}
            onEdit={() => handleEditClick('kari')}
            onSave={handleSave}
            onCancel={handleCancel}
            onChange={handleInputChange}
            tempValue={tempValue}
            backgroundColor="#e8f5e9"
          />

          <IncomeCard
            title="Adolfo's Income"
            amount={incomeData ? formatNumber(incomeData.adolfo_income) : '0,00'}
            percentage={incomeData ? formatNumber(incomeData.adolfo_percentage) : '0,00'}
            editing={editing === 'adolfo'}
            onEdit={() => handleEditClick('adolfo')}
            onSave={handleSave}
            onCancel={handleCancel}
            onChange={handleInputChange}
            tempValue={tempValue}
            backgroundColor="#e3f2fd"
          />

          <IncomeCard
            title="Total Income"
            amount={incomeData ? formatNumber(incomeData.total_income) : '0,00'}
            percentage="100,00"
            backgroundColor="#f5f5f5"
          />
        </Stack>
      )}
    </Container>
  );
};

export default Dashboard;
