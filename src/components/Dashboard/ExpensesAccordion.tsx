import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SellIcon from '@mui/icons-material/Sell';
import { Expense } from '../../interfaces/Expenses';
import PaymentIcon from '@mui/icons-material/Payment';
import CalculateIcon from '@mui/icons-material/Calculate';

interface ExpensesAccordionProps {
  expense: Expense;
  formatNumber: (value: number) => string;
}

const ExpensesAccordion: React.FC<ExpensesAccordionProps> = ({ expense, formatNumber }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs')); 
  const isSm = useMediaQuery(theme.breakpoints.only('sm')); 
  const isMd = useMediaQuery(theme.breakpoints.only('md')); 
  const isLg = useMediaQuery(theme.breakpoints.up('lg')); 

  const descriptionWidth = isXs
    ? '100px'
    : isSm
    ? '200px'
    : isMd
    ? '300px'
    : isLg
    ? '400px'
    : '100%';

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f9f9f9' }}>
        <Stack
          direction="row"
          spacing={2}
          width="100%"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="body1" noWrap sx={{ width: '90px' }}>
            {expense.date}
          </Typography>

          <Typography
            variant="body1"
            fontWeight="bold"
            noWrap
            sx={{
              width: descriptionWidth,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {expense.description}
          </Typography>

          <Typography variant="body1" color="primary" noWrap sx={{ width: '80px', textAlign: 'right' }}>
            € {formatNumber(expense.amount)}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip icon={<SellIcon />} label={expense.category} color="primary" variant="outlined" />
          <Chip icon={<CalculateIcon/>} label={expense.type} color="secondary" variant="outlined" />
          <Chip icon={<PaymentIcon/>} label={`${expense.isPaidByKari ? 'Kari' : 'Adolfo'}`} color="success" variant="outlined" />
        </Stack>
        <Divider sx={{ mt: 2 }} />
      </AccordionDetails>
    </Accordion>
  );
};

export default ExpensesAccordion;
