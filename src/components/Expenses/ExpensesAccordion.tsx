import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
  Chip,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SellIcon from '@mui/icons-material/Sell';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PaymentIcon from '@mui/icons-material/Payment';
import CalculateIcon from '@mui/icons-material/Calculate';
import { Expense } from '../../interfaces/Expenses';
import { useNotifications } from '../../context';
import { ROUTES } from '../../constants/routes';
import ExpensesDeleteModal from './ExpensesDeleteModal';
import { useState } from 'react';
import { useDeleteExpenseMutation } from '../../api/expenses/expenses';
import { formatDate } from '../../utils/date';

interface ExpensesAccordionProps {
  expense: Expense;
  formatNumber: (value: number) => string;
}

const ExpensesAccordion: React.FC<ExpensesAccordionProps> = ({ expense, formatNumber }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { showNotification } = useNotifications();
  const { mutate: deleteExpense } = useDeleteExpenseMutation();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));
  const [open, setOpen] = useState(false);

  const descriptionWidth = isXs ? '100px' : isSm ? '200px' : isMd ? '300px' : isLg ? '400px' : '100%';

  const handleDelete = async (expenseId: number) => {
    try {
      deleteExpense(expenseId);
      setOpen(false);
    } catch (error) {
      console.error('Failed to delete the expense', error);
      showNotification(`Failed to delete the expense ${error}`, 'error');
    }
  };

  const handleClose = () => setOpen(false);

  const handleEdit = (expenseId: number) => {
    navigate(`${ROUTES.EXPENSES}${expenseId}`);
  };

  return (
    <Accordion
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: theme.palette.text.primary }} />}
        sx={{
          backgroundColor: theme.palette.grey[900],
          color: theme.palette.text.primary,
        }}
      >
        <Stack direction='row' spacing={2} width='100%' alignItems='center' justifyContent='space-between'>
          <Typography variant='body1' noWrap sx={{ width: '90px', color: theme.palette.text.primary }}>
            {formatDate(expense.date) || expense.date}
          </Typography>

          <Typography
            variant='body1'
            fontWeight='bold'
            noWrap
            sx={{
              width: descriptionWidth,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: theme.palette.text.primary,
            }}
          >
            {expense.description}
          </Typography>
          <Typography
            variant='body1'
            color='primary'
            noWrap
            sx={{ width: '80px', textAlign: 'right', color: theme.palette.primary.main }}
          >
            $ {formatNumber(expense.amount)}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack direction='row' spacing={1} flexWrap='wrap' alignItems='center' justifyContent='space-between'>
          <Stack direction='row' spacing={1} flexWrap='wrap'>
            <Chip
              icon={<SellIcon />}
              label={expense.category}
              color='primary'
              variant='outlined'
              sx={{ color: theme.palette.text.primary }}
            />
            <Chip
              icon={<CalculateIcon />}
              label={expense.type}
              color='secondary'
              variant='outlined'
              sx={{ color: theme.palette.text.primary }}
            />
            <Chip
              icon={<PaymentIcon />}
              label={`${expense.isPaidByKari ? 'Kari' : 'Adolfo'}`}
              color='success'
              variant='outlined'
              sx={{ color: theme.palette.text.primary }}
            />
          </Stack>
          <Stack direction='row' spacing={1}>
            <IconButton color='primary' onClick={() => handleEdit(expense.id)} aria-label='edit' size='small'>
              <EditIcon />
            </IconButton>
            <IconButton color='error' onClick={() => setOpen(true)} aria-label='delete' size='small'>
              <DeleteIcon />
            </IconButton>
          </Stack>
        </Stack>
      </AccordionDetails>
      <ExpensesDeleteModal open={open} handleClose={handleClose} handleDelete={handleDelete} expenseId={expense.id} />
    </Accordion>
  );
};

export default ExpensesAccordion;
