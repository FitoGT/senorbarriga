import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Stack, Typography, Box, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpensesAccordion from '../Expenses/ExpensesAccordion';
import FullLoader from '../Loader/FullLoader';
import { useNotifications } from '../../context';
import { ROUTES } from '../../constants/routes';
import { useGetAllExpenses } from '../../api/expenses/expenses';
import { formatDecimal } from '../../utils/number';

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
    <Container maxWidth='lg' sx={{ mt: 2, mb: 5, px: { xs: 2, sm: 2.25 } }}>
      {isLoading ? (
        <FullLoader />
      ) : (
        <>
          <Stack spacing={1.5}>
            <Box display='flex' alignItems='center' justifyContent='space-between' flexWrap='wrap' gap={1.25}>
              <Typography variant='h5' fontWeight='bold' color='text.primary'>
                Expenses
              </Typography>
              <IconButton
                color='primary'
                onClick={() => navigate(ROUTES.EXPENSE)}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.light' },
                }}
              >
                <AddIcon />
              </IconButton>
            </Box>
            {!expenses?.length ? (
              <Typography color='text.secondary'>No expenses recorded.</Typography>
            ) : (
              <Box
                sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(420px,100%),1fr))', gap: 1.5 }}
              >
                {expenses.map((expense) => (
                  <ExpensesAccordion key={expense.id} expense={expense} formatNumber={formatDecimal} />
                ))}
              </Box>
            )}
          </Stack>
        </>
      )}
    </Container>
  );
};

export default Expenses;
