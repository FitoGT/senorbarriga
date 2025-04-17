import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Stack, Typography, Box, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpensesAccordion from '../Expenses/ExpensesAccordion';
import FullLoader from '../Loader/FullLoader';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Expense } from '../../interfaces';
import { useNotifications } from '../../context';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const Expenses = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesData] = await Promise.all([supabaseService.getAllExpenses()]);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification(`Error fetching data: ${error}`, 'error');
    }
    setLoading(false);
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

export default Expenses;
