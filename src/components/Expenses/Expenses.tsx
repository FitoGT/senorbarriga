import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Stack, Typography, Box, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpensesAccordion from '../Expenses/ExpensesAccordion';
import FullLoader from '../Loader/FullLoader';
import { useNotifications } from '../../context';
import { ROUTES } from '../../constants/routes';
import { useGetAllExpenses } from '../../api/expenses/expenses';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const Expenses = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const { data: expenses, isLoading, error } = useGetAllExpenses();

  useEffect(() => {
    if (error) {
      showNotification(`Error retrieving expenses: ${error}`, 'error');
    }
  }, [error, showNotification]);
  return (
    <Container maxWidth='md' sx={{ mt: 4 }}>
      {isLoading ? (
        <FullLoader />
      ) : (
        <>
          <Stack spacing={2} sx={{ mt: 4 }}>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <Typography variant='h6' fontWeight='bold' color='text.primary'>
                Expenses
              </Typography>
              <IconButton color='primary' onClick={() => navigate(ROUTES.EXPENSE)}>
                <AddIcon />
              </IconButton>
            </Box>
            {!expenses || expenses.length === 0 ? (
              <Typography color='text.secondary'>No expenses recorded.</Typography>
            ) : (
              expenses.map((expense) => (
                <ExpensesAccordion
                  key={expense.id}
                  expense={expense}
                  formatNumber={formatNumber}
                  refreshExpenses={() => console.log('ya')}
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
