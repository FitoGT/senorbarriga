import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Income, Expense } from '../../interfaces';
import { 
  Container, 
  CircularProgress, 
  Stack, 
  Typography, 
  Box, 
  IconButton 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import IncomeCard from './IncomeCard';
import ExpensesAccordion from './ExpensesAccordion';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [incomeData, setIncomeData] = useState<Income | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [latestIncome, expensesData] = await Promise.all([
        supabaseService.getLatestIncome(),
        supabaseService.getAllExpenses(),
      ]);

      setIncomeData(latestIncome);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">
            <IncomeCard
              title="Kari's Income"
              amount={incomeData ? formatNumber(incomeData.kari_income) : '0,00'}
              percentage={incomeData ? formatNumber(incomeData.kari_percentage) : '0,00'}
              backgroundColor="#e8f5e9"
            />
            <IncomeCard
              title="Adolfo's Income"
              amount={incomeData ? formatNumber(incomeData.adolfo_income) : '0,00'}
              percentage={incomeData ? formatNumber(incomeData.adolfo_percentage) : '0,00'}
              backgroundColor="#e3f2fd"
            />
            <IncomeCard
              title="Total Income"
              amount={incomeData ? formatNumber(incomeData.total_income) : '0,00'}
              percentage="100,00"
              backgroundColor="#f5f5f5"
            />
          </Stack>

          {/* Expenses Title with IconButton */}
          <Stack spacing={2} sx={{ mt: 4 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight="bold">
                Expenses
              </Typography>
              <IconButton color="primary" onClick={() => navigate('/expense')}>
                <AddIcon />
              </IconButton>
            </Box>

            {expenses.length === 0 ? (
              <Typography color="textSecondary">No expenses recorded.</Typography>
            ) : (
              expenses.map((expense) => (
                <ExpensesAccordion key={expense.id} expense={expense} formatNumber={formatNumber} refreshExpenses={fetchData}/>
              ))
            )}
          </Stack>
        </>
      )}
    </Container>
  );
};

export default Dashboard;
