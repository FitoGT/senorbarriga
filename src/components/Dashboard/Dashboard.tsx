import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Expense from '../Expense/Expense';
import FullLoader from '../Loader/FullLoader';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Income, Saving, TotalDebt, TotalExpenses } from '../../interfaces';
import { useNotifications } from '../../context';
import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';
import { buildRatesMap } from '../../utils/currency';
import { formatDecimal } from '../../utils/number';
import { calculateSavingsSummary, getLatestSavingsGroup, groupSavingsByDate } from '../../utils/savings';
import { ROUTES } from '../../constants/routes';

const money = (value: number) => `${formatDecimal(value)} €`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotifications();
  const [income, setIncome] = useState<Income | null>(null);
  const [expenses, setExpenses] = useState<TotalExpenses | null>(null);
  const [debt, setDebt] = useState<TotalDebt | null>(null);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: exchangeRate } = useGetCurrentExchangeRate();
  const rates = useMemo(() => buildRatesMap(exchangeRate), [exchangeRate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [nextIncome, nextExpenses, nextDebt, nextSavings] = await Promise.all([
        supabaseService.getLatestIncome(),
        supabaseService.getTotalExpenses(),
        supabaseService.getTotalDebt(),
        supabaseService.getAllSavings(),
      ]);
      setIncome(nextIncome);
      setExpenses(nextExpenses);
      setDebt(nextDebt);
      setSavings(nextSavings);
    } catch (error) {
      showNotification(`Error fetching dashboard: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const savingsSummary = useMemo(() => {
    const latest = getLatestSavingsGroup(groupSavingsByDate(savings));
    return calculateSavingsSummary(latest?.savings ?? [], rates);
  }, [rates, savings]);

  const kariOwes = (debt?.kari ?? 0) > 0;
  const debtAmount = Math.max(debt?.kari ?? 0, debt?.adolfo ?? 0);

  if (loading) return <FullLoader />;

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 2.25 }, pt: 0.5, pb: 5 }}>
      <Box sx={{ bgcolor: '#1e2027', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,.28)' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 2, p: 2.25 }}>
          <Box>
            <Box display='flex' alignItems='center' gap={0.9}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
              <Typography variant='caption' color='text.secondary' fontWeight={700}>Kari&apos;s share</Typography>
            </Box>
            <Typography variant='h5' mt={1} color='success.main'>{money(expenses?.kari ?? 0)}</Typography>
            <Typography variant='caption' color='text.secondary'>
              {formatDecimal(income?.kari_percentage ?? 0)}% share of total
            </Typography>
          </Box>
          <Box>
            <Box display='flex' alignItems='center' gap={0.9}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main' }} />
              <Typography variant='caption' color='text.secondary' fontWeight={700}>Adolfo&apos;s share</Typography>
            </Box>
            <Typography variant='h5' mt={1} color='info.main'>{money(expenses?.adolfo ?? 0)}</Typography>
            <Typography variant='caption' color='text.secondary'>
              {formatDecimal(income?.adolfo_percentage ?? 0)}% share of total
            </Typography>
          </Box>
          <Box>
            <Box display='flex' alignItems='center' gap={0.9}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.primary' }} />
              <Typography variant='caption' color='text.secondary' fontWeight={700}>Total expenses</Typography>
            </Box>
            <Typography variant='h5' mt={1} color='text.primary'>{money(expenses?.total ?? 0)}</Typography>
            <Typography variant='caption' color='text.secondary'>100% of total</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 16px', px: 2.25, py: 1.6, bgcolor: '#1b1c2d', borderTop: '1px solid #30325b' }}>
          <Typography variant='caption' sx={{ color: '#b9bcf4', fontWeight: 700 }}>
            {kariOwes ? 'Kari owes Adolfo' : 'Adolfo owes Kari'}
          </Typography>
          <Typography variant='h5' color='primary.light'>{money(debtAmount)}</Typography>
        </Box>
        <Box
          component='button'
          onClick={() => navigate(ROUTES.SAVINGS)}
          sx={{ width: '100%', border: 0, borderTop: '1px solid #262932', bgcolor: '#1a1c22', color: 'text.primary', px: 2.25, py: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, cursor: 'pointer', textAlign: 'left', '&:hover': { bgcolor: '#232630' } }}
        >
          <Typography variant='caption' color='text.secondary' fontWeight={700}>Savings</Typography>
          <Typography fontWeight={800}>{money(savingsSummary.total)}</Typography>
          <Typography variant='body2' color='success.main' fontWeight={700}>K {money(savingsSummary.kari)}</Typography>
          <Typography variant='body2' color='info.main' fontWeight={700}>A {money(savingsSummary.adolfo)}</Typography>
          <Typography variant='caption' color='text.secondary' sx={{ ml: 'auto' }}>View savings →</Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 1.75 }}>
        <Expense embedded onSaved={fetchData} />
      </Box>
      <Typography variant='caption' sx={{ display: 'block', px: 0.75, pt: 3.5, color: '#5f6674', fontWeight: 600 }}>
        Señor Barriga App — shared money, two people
      </Typography>
    </Container>
  );
};

export default Dashboard;
