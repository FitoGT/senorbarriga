import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Stack, Typography, Box, IconButton } from '@mui/material';
import IncomeCard from './IncomeCard';
import AddIcon from '@mui/icons-material/Add';
import ExpensesAccordion from './ExpensesAccordion';
import FullLoader from '../Loader/FullLoader';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Income, Expense } from '../../interfaces';
import { useNotifications } from '../../context';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [incomeData, setIncomeData] = useState<Income | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<'kari' | 'adolfo' | null>(null);
  const [tempValue, setTempValue] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [latestIncome, expensesData] = await Promise.all([
        supabaseService.getLatestIncome(),
        supabaseService.getAllExpenses(),
        supabaseService.getTotalExpenses(),
      ]);
      setIncomeData(latestIncome);
      setExpenses(expensesData);
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
          <Stack spacing={2} sx={{ mt: 4 }}>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <Typography variant='h6' fontWeight='bold' color='text.primary'>
                Expenses
              </Typography>
              <IconButton color='primary' onClick={() => navigate('/expense')}>
                <AddIcon />
              </IconButton>
            </Box>
            {expenses.length === 0 ? (
              <Typography color='text.secondary'>No expenses recorded.</Typography>
            ) : (
              expenses.map((expense) => (
                <ExpensesAccordion
                  key={expense.id}
                  expense={expense}
                  formatNumber={formatNumber}
                  refreshExpenses={fetchData}
                />
              ))
            )}
          </Stack>
        </>
      )}
    </Container>
  );
};

export default Dashboard;
