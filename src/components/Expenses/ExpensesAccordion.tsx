import { useState } from 'react';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PaymentsIcon from '@mui/icons-material/Payments';
import PercentIcon from '@mui/icons-material/Percent';
import PersonIcon from '@mui/icons-material/Person';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { useNavigate } from 'react-router-dom';
import type { DialogProps } from '@mui/material/Dialog';
import { Expense } from '../../interfaces/Expenses';
import { useNotifications } from '../../context';
import { ROUTES } from '../../constants/routes';
import ExpensesDeleteModal from './ExpensesDeleteModal';
import { useDeleteExpenseMutation } from '../../api/expenses/expenses';

interface ExpensesAccordionProps {
  expense: Expense;
  formatNumber: (value: number) => string;
}

const ExpensesAccordion = ({ expense, formatNumber }: ExpensesAccordionProps) => {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const { mutate: deleteExpense } = useDeleteExpenseMutation();
  const [open, setOpen] = useState(false);
  const [year, month, day] = expense.date.split('-').map(Number);
  const monthLabel = Number.isFinite(month)
    ? new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(year, month - 1, day)).toUpperCase()
    : '';

  const handleDelete = (expenseId: number) => {
    try {
      deleteExpense(expenseId);
      setOpen(false);
    } catch (error) {
      showNotification(`Failed to delete the expense ${error}`, 'error');
    }
  };

  const handleClose: NonNullable<DialogProps['onClose']> = () => setOpen(false);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px 14px',
          p: 2,
          bgcolor: '#1e2027',
          borderRadius: '20px',
          boxShadow: '0 8px 22px rgba(0,0,0,.22)',
        }}
      >
        <Box sx={{ width: 46, flex: 'none', textAlign: 'center' }}>
          <Typography fontWeight={800} lineHeight={1}>
            {String(day || '').padStart(2, '0')}
          </Typography>
          <Typography variant='caption' color='text.secondary' fontWeight={700}>
            {monthLabel}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0, flex: '1 1 150px' }}>
          <Typography fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
            {expense.description}
          </Typography>
          <Box display='flex' alignItems='center' flexWrap='wrap' gap={1} mt={0.6}>
            <Chip
              size='small'
              icon={<PaymentsIcon />}
              label={expense.isPaidByKari ? 'Kari' : 'Adolfo'}
              title={expense.isPaidByKari ? 'Paid by Kari' : 'Paid by Adolfo'}
              variant='outlined'
              sx={{
                height: 26,
                color: 'text.secondary',
                borderColor: '#333846',
                fontSize: 11,
                '& .MuiChip-icon': { color: 'inherit', fontSize: 15 },
              }}
            />
            {expense.type === 'kari' || expense.type === 'adolfo' ? (
              <Chip
                size='small'
                icon={<PersonIcon />}
                label={expense.type === 'kari' ? 'Kari' : 'Adolfo'}
                title={expense.type === 'kari' ? 'Kari only' : 'Adolfo only'}
                variant='outlined'
                sx={{
                  height: 26,
                  color: 'text.secondary',
                  borderColor: '#333846',
                  fontSize: 11,
                  '& .MuiChip-icon': { color: 'inherit', fontSize: 15 },
                }}
              />
            ) : (
              <Box
                title={expense.type === 'percentage' ? 'Percentage split' : '50 / 50 split'}
                aria-label={expense.type === 'percentage' ? 'Percentage split' : '50 / 50 split'}
                sx={{
                  minWidth: 30,
                  height: 26,
                  px: 0.75,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'text.secondary',
                  border: '1px solid #333846',
                  borderRadius: 999,
                }}
              >
                {expense.type === 'percentage' ? (
                  <PercentIcon sx={{ fontSize: 18 }} />
                ) : (
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      border: '2px solid currentColor',
                      borderRadius: '50%',
                      background: 'linear-gradient(90deg, currentColor 50%, transparent 50%)',
                    }}
                  />
                )}
              </Box>
            )}
            {expense.is_default && (
              <Box
                title='Monthly'
                aria-label='Monthly recurring expense'
                sx={{
                  minWidth: 30,
                  height: 26,
                  px: 0.75,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'text.secondary',
                  border: '1px solid #333846',
                  borderRadius: 999,
                }}
              >
                <EventRepeatIcon sx={{ fontSize: 18 }} />
              </Box>
            )}
            <Chip
              size='small'
              label={expense.category}
              variant='outlined'
              sx={{
                height: 26,
                color: 'text.secondary',
                borderColor: '#333846',
                fontSize: 11,
                textTransform: 'capitalize',
              }}
            />
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
            flex: { xs: '1 0 100%', sm: 'none' },
            pt: { xs: 1, sm: 0 },
            borderTop: { xs: '1px solid #262932', sm: 0 },
          }}
        >
          <Typography fontWeight={800} sx={{ mr: 0.5, fontVariantNumeric: 'tabular-nums' }}>
            $ {formatNumber(expense.amount)}
          </Typography>
          <IconButton
            onClick={() => navigate(`${ROUTES.EXPENSES}${expense.id}`)}
            aria-label='Edit expense'
            sx={{
              bgcolor: '#242832',
              color: 'text.secondary',
              '&:hover': { bgcolor: '#2f333e', color: 'text.primary' },
            }}
          >
            <EditIcon fontSize='small' />
          </IconButton>
          <IconButton
            onClick={() => setOpen(true)}
            aria-label='Delete expense'
            sx={{ bgcolor: '#242832', color: 'text.secondary', '&:hover': { bgcolor: '#3a2521', color: '#ff8f78' } }}
          >
            <DeleteIcon fontSize='small' />
          </IconButton>
        </Box>
      </Box>
      <ExpensesDeleteModal open={open} handleClose={handleClose} handleDelete={handleDelete} expenseId={expense.id} />
    </>
  );
};

export default ExpensesAccordion;
