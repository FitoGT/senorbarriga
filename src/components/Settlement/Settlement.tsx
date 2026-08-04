import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Container, IconButton, Stack, TextField, Typography, useTheme } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Debt, DebtPayment, Income, TotalDebt } from '../../interfaces';
import { currentMonth } from '../../utils/date';
import { formatDecimal } from '../../utils/number';
import { useNotifications } from '../../context';
import FullLoader from '../Loader/FullLoader';
import SettlementDeleteDialog from './SettlementDeleteDialog';

const money = (value: number) => `${formatDecimal(value)} €`;

interface SettlementProps {
  section: 'income' | 'debt';
}

const Settlement = ({ section }: SettlementProps) => {
  const { showNotification } = useNotifications();
  const theme = useTheme();
  const month = currentMonth();
  const [loading, setLoading] = useState(true);
  const [savingIncome, setSavingIncome] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [debt, setDebt] = useState<TotalDebt>({ adolfo: 0, kari: 0 });
  const [monthlyDebts, setMonthlyDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [kariIncome, setKariIncome] = useState('');
  const [adolfoIncome, setAdolfoIncome] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'income'; value: Income } | { kind: 'payment'; value: DebtPayment } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextDebt, nextMonthlyDebts, nextPayments, nextIncomes] = await Promise.all([
        supabaseService.getTotalDebt(), supabaseService.getAllDebts(), supabaseService.getDebtPayments(), supabaseService.getIncomeSnapshots(),
      ]);
      setDebt(nextDebt);
      setMonthlyDebts(nextMonthlyDebts);
      setPayments(nextPayments);
      setIncomes(nextIncomes);
      const current = nextIncomes.find((income) => income.month_key === month) ?? nextIncomes[0];
      setKariIncome(String(current?.kari_income ?? ''));
      setAdolfoIncome(String(current?.adolfo_income ?? ''));
    } catch (error) {
      showNotification(`Error loading settlement: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [month, showNotification]);

  useEffect(() => { load(); }, [load]);

  const saveIncome = async (event: FormEvent) => {
    event.preventDefault();
    setSavingIncome(true);
    try {
      await supabaseService.upsertIncomeSnapshot(month, Number(kariIncome), Number(adolfoIncome));
      showNotification('Monthly income snapshot saved', 'success');
      await load();
    } catch (error) { showNotification(String(error), 'error'); } finally { setSavingIncome(false); }
  };

  const savePayment = async (event: FormEvent) => {
    event.preventDefault();
    setSavingPayment(true);
    try {
      await supabaseService.recordDebtPayment(Number(paymentAmount), paymentNote);
      setPaymentAmount(''); setPaymentNote('');
      showNotification('Debt payment recorded', 'success');
      await load();
    } catch (error) { showNotification(String(error), 'error'); } finally { setSavingPayment(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'income') await supabaseService.deleteIncomeSnapshot(deleteTarget.value.month_key);
      else await supabaseService.deleteDebtPayment(deleteTarget.value.id);
      setDeleteTarget(null);
      showNotification(deleteTarget.kind === 'income' ? 'Income snapshot deleted' : 'Payment snapshot deleted', 'success');
      await load();
    } catch (error) { showNotification(String(error), 'error'); } finally { setDeleting(false); }
  };

  if (loading) return <FullLoader />;
  const adolfoOwes = debt.adolfo > 0;
  const debtAmount = Math.max(debt.adolfo, debt.kari);
  const debtor = debtAmount ? (adolfoOwes ? 'Adolfo' : 'Kari') : 'Nobody';
  const creditor = adolfoOwes ? 'Kari' : 'Adolfo';

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 2.25 }, pt: 0.5, pb: 5 }}>
      <Stack spacing={2}>
        <Typography variant='h5' sx={{ px: 0.5 }}>{section === 'income' ? 'Income' : 'Debt'}</Typography>
        {section === 'debt' && <Box sx={{ order: 3 }}>
          <Typography variant='h5' sx={{ mt: 1.25, mb: 1.75, px: 0.5 }}>Monthly breakdown</Typography>
          <Stack spacing={1.5}>{monthlyDebts.map((monthlyDebt) => {
            const adolfoMonthly = Number(monthlyDebt.adolfo_debt || 0);
            const kariMonthly = Number(monthlyDebt.kari_debt || 0);
            const amount = Math.max(adolfoMonthly, kariMonthly);
            const summary = amount === 0 ? 'Settled' : adolfoMonthly > 0 ? `Adolfo owes Kari · ${money(amount)}` : `Kari owes Adolfo · ${money(amount)}`;
            return <Accordion key={monthlyDebt.id} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: theme.palette.grey[900] }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} width='100%' justifyContent='space-between' gap={1}>
                  <Typography fontWeight='bold'>{monthlyDebt.month_key}</Typography>
                  <Typography variant='body2' color={amount ? 'text.primary' : 'text.secondary'} fontWeight={amount ? 700 : 400}>{summary}</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails><Stack spacing={1}>
                <Box display='flex' justifyContent='space-between'><Typography>Adolfo owes Kari</Typography><Typography fontWeight={800}>{money(adolfoMonthly)}</Typography></Box>
                <Box display='flex' justifyContent='space-between'><Typography>Kari owes Adolfo</Typography><Typography fontWeight={800}>{money(kariMonthly)}</Typography></Box>
              </Stack></AccordionDetails>
            </Accordion>;
          })}</Stack>
        </Box>}
        {section === 'debt' && <Box sx={{ bgcolor: 'background.paper', borderRadius: '22px', p: { xs: 2, sm: 3 }, boxShadow: '0 14px 34px rgba(0,0,0,.3)', order: 1 }}>
          <Typography variant='caption' color='text.secondary' fontWeight={700}>TOTAL OUTSTANDING</Typography>
          <Typography variant='h4' mt={0.75}>{money(debtAmount)}</Typography>
          <Typography color='text.secondary'>{debtAmount ? `${debtor} owes ${creditor}` : 'Everything is settled'}</Typography>
        </Box>}
        {section === 'debt' && debtAmount > 0 && <Box component='form' onSubmit={savePayment} sx={{ bgcolor: 'background.paper', borderRadius: '22px', p: { xs: 2, sm: 3 }, boxShadow: '0 14px 34px rgba(0,0,0,.3)', order: 2 }}>
            <Typography fontWeight={750} mb={1}>Record payment from {debtor} to {creditor}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <TextField required type='number' label='Amount' value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} inputProps={{ min: 0.01, max: debtAmount, step: 0.01 }} />
              <TextField label='Note (optional)' value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} fullWidth />
              <Button type='submit' variant='contained' disabled={savingPayment}>Record</Button>
            </Stack>
        </Box>}

        {section === 'income' && <Box sx={{ bgcolor: 'background.paper', borderRadius: '22px', p: { xs: 2, sm: 3 }, boxShadow: '0 14px 34px rgba(0,0,0,.3)' }}>
          <Typography variant='h6' fontWeight={800}>Income · {month}</Typography>
          <Box component='form' onSubmit={saveIncome} mt={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <TextField required type='number' label="Kari's income" value={kariIncome} onChange={(e) => setKariIncome(e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
              <TextField required type='number' label="Adolfo's income" value={adolfoIncome} onChange={(e) => setAdolfoIncome(e.target.value)} inputProps={{ min: 0, step: 0.01 }} />
              <Button type='submit' variant='contained' disabled={savingIncome}>Save</Button>
            </Stack>
          </Box>
        </Box>}
        {section === 'income' && <Box>
          <Typography variant='h5' sx={{ mt: 1.25, mb: 1.75, px: 0.5 }}>Income history</Typography>
          <Stack spacing={1.5}>{incomes.map((income) => <Accordion key={income.id} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: theme.palette.grey[900] }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} width='100%' justifyContent='space-between' alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1}>
                <Typography fontWeight='bold'>{income.month_key}</Typography>
                <Stack direction='row' alignItems='center' gap={0.5}><Typography variant='body2' color='text.secondary'>Total {money(income.total_income)}</Typography><IconButton size='small' color='error' aria-label={`Delete income snapshot ${income.month_key}`} onClick={(event) => { event.stopPropagation(); setDeleteTarget({ kind: 'income', value: income }); }}><DeleteIcon fontSize='small' /></IconButton></Stack>
              </Stack>
            </AccordionSummary>
            <AccordionDetails><Stack spacing={1}>
              <Box display='flex' justifyContent='space-between'><Typography>Kari</Typography><Typography fontWeight={800}>{money(income.kari_income)} · {formatDecimal(income.kari_percentage)}%</Typography></Box>
              <Box display='flex' justifyContent='space-between'><Typography>Adolfo</Typography><Typography fontWeight={800}>{money(income.adolfo_income)} · {formatDecimal(income.adolfo_percentage)}%</Typography></Box>
            </Stack></AccordionDetails>
          </Accordion>)}</Stack>
        </Box>}
        {section === 'debt' && <Box sx={{ order: 4 }}>
          <Typography variant='h5' sx={{ mt: 1.25, mb: 1.75, px: 0.5 }}>Payment history</Typography>
          {payments.length ? <Stack spacing={1.5}>{payments.map((payment) => <Accordion key={payment.id} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: theme.palette.grey[900] }}>
              <Stack direction='row' width='100%' justifyContent='space-between' alignItems='center' gap={1}>
                <Box><Typography fontWeight='bold'>{payment.paid_at}</Typography><Typography variant='body2' color='text.secondary'>{payment.payer === 'adolfo' ? 'Adolfo' : 'Kari'} → {payment.recipient === 'adolfo' ? 'Adolfo' : 'Kari'}</Typography></Box>
                <Stack direction='row' alignItems='center' gap={0.5}><Typography color='primary.main' fontWeight='bold'>{money(payment.amount)}</Typography><IconButton size='small' color='error' aria-label={`Delete payment snapshot ${payment.paid_at}`} onClick={(event) => { event.stopPropagation(); setDeleteTarget({ kind: 'payment', value: payment }); }}><DeleteIcon fontSize='small' /></IconButton></Stack>
              </Stack>
            </AccordionSummary>
            <AccordionDetails><Typography color='text.secondary'>{payment.note || 'No note'}</Typography></AccordionDetails>
          </Accordion>)}</Stack> : <Box sx={{ p: 2.5, bgcolor: '#1e2027', borderRadius: '20px' }}><Typography color='text.secondary'>No payments recorded yet.</Typography></Box>}
        </Box>}
      </Stack>
      <SettlementDeleteDialog
        open={Boolean(deleteTarget)}
        label={deleteTarget ? (deleteTarget.kind === 'income' ? deleteTarget.value.month_key : `${money(deleteTarget.value.amount)} · ${deleteTarget.value.paid_at}`) : ''}
        title={deleteTarget?.kind === 'payment' ? 'Delete payment snapshot?' : 'Delete income snapshot?'}
        message={deleteTarget?.kind === 'payment' ? 'This will remove the payment and recalculate the outstanding debt for' : 'This will remove the income snapshot and recalculate affected months from'}
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Container>
  );
};

export default Settlement;
