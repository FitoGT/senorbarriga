import { useEffect, useMemo, useState } from 'react';
import { Container, Stack, IconButton, Tooltip } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DownloadIcon from '@mui/icons-material/Download';
import DisplayCard from './DisplayCard';
import FullLoader from '../Loader/FullLoader';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Income, TotalExpenses, TotalDebt, Saving, SavingUser, Currencies } from '../../interfaces';
import { useNotifications } from '../../context';
import { useExportDatabaseMutation } from '../../api/db/db';
import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';
import { buildRatesMap, convertToEuro, CurrencyRateMap } from '../../utils/currency';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

type SavingsSummary = {
  kari: number;
  adolfo: number;
  total: number;
  kariPercentage: number;
  adolfoPercentage: number;
};

type SavingsSnapshot = {
  timestamp: number;
  savings: Saving[];
};

const groupSavingsSnapshots = (allSavings: Saving[]): SavingsSnapshot[] => {
  if (!allSavings.length) {
    return [];
  }

  const groups = new Map<string, SavingsSnapshot>();

  for (const saving of allSavings) {
    const createdAt = saving.created_at ?? '';
    const parsedDate = new Date(createdAt);
    const timestamp = Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
    const key = Number.isNaN(parsedDate.getTime()) ? createdAt : parsedDate.toISOString().split('T')[0];

    const existing = groups.get(key);

    if (existing) {
      existing.savings.push(saving);
      existing.timestamp = Math.max(existing.timestamp, timestamp);
    } else {
      groups.set(key, {
        savings: [saving],
        timestamp,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
};

const calculateSavingsTotals = (allSavings: Saving[], rates: CurrencyRateMap): SavingsSummary => {
  const snapshots = groupSavingsSnapshots(allSavings);
  const latestSnapshot = snapshots[0];

  if (!latestSnapshot || latestSnapshot.savings.length === 0) {
    return {
      kari: 0,
      adolfo: 0,
      total: 0,
      kariPercentage: 0,
      adolfoPercentage: 0,
    };
  }

  let kariTotal = 0;
  let adolfoTotal = 0;

  for (const saving of latestSnapshot.savings) {
    if (!saving.user) {
      continue;
    }

    const amount = typeof saving.amount === 'number' ? saving.amount : Number(saving.amount ?? 0);
    const amountInEUR = convertToEuro(amount, saving.currency ?? Currencies.EUR, rates);

    if (saving.user === SavingUser.KARI) {
      kariTotal += amountInEUR;
    }

    if (saving.user === SavingUser.ADOLFO) {
      adolfoTotal += amountInEUR;
    }
  }

  const total = kariTotal + adolfoTotal;
  const normalize = (value: number) => Number(value.toFixed(2));

  return {
    kari: normalize(kariTotal),
    adolfo: normalize(adolfoTotal),
    total: normalize(total),
    kariPercentage: total ? normalize((kariTotal / total) * 100) : 0,
    adolfoPercentage: total ? normalize((adolfoTotal / total) * 100) : 0,
  };
};

const Dashboard = () => {
  const { showNotification } = useNotifications();
  const [incomeData, setIncomeData] = useState<Income | null>(null);
  const [expensesData, setExpensesData] = useState<TotalExpenses | null>(null);
  const [debtData, setDebtData] = useState<TotalDebt | null>(null);
  const [savingsData, setSavingsData] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<'kari' | 'adolfo' | null>(null);
  const [tempValue, setTempValue] = useState<string | null>(null);
  const { mutate: exportDB, isPending } = useExportDatabaseMutation();
  const { data: exchangeRate } = useGetCurrentExchangeRate();
  const currencyRates = useMemo(() => buildRatesMap(exchangeRate), [exchangeRate]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [latestIncome, totalExpenses, totalDebt, allSavings] = await Promise.all([
        supabaseService.getLatestIncome(),
        supabaseService.getTotalExpenses(),
        supabaseService.getTotalDebt(),
        supabaseService.getAllSavings(),
      ]);
      setIncomeData(latestIncome);
      setExpensesData(totalExpenses);
      setDebtData(totalDebt);
      setSavingsData(allSavings);
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification(`Error fetching data: ${error}`, 'error');
      setSavingsData([]);
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
      await fetchData();
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

  const handleResetMonth = async () => {
    try {
      await supabaseService.resetMonth();
      showNotification('Month has been reset successfully', 'success');
      await fetchData();
    } catch (error) {
      console.error('Error resetting month:', error);
      showNotification(`Error resetting month: ${error}`, 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const savingsTotals = useMemo(() => calculateSavingsTotals(savingsData, currencyRates), [savingsData, currencyRates]);
  const hasSavingsData = savingsData.length > 0;

  return (
    <Container maxWidth='md' sx={{ mt: 10, mb: 10 }}>
      {loading ? (
        <FullLoader />
      ) : (
        <>
          {/* Reset Month Button */}
          <Stack direction='row' justifyContent='end' alignItems='center' sx={{ mb: 2 }}>
            <Tooltip title='Reset Month'>
              <IconButton onClick={handleResetMonth} color='error'>
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title='Download DB as CSV'>
              <span>
                <IconButton onClick={() => exportDB()} color='primary' disabled={isPending}>
                  <DownloadIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          {/* Incomes */}
          <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent='center'>
            <DisplayCard
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
            <DisplayCard
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
            <DisplayCard
              title='Total Income'
              amount={incomeData ? formatNumber(incomeData.total_income) : '0,00'}
              percentage='100,00'
              color='primary'
            />
          </Stack>
          {/* Expenses */}
          <Stack sx={{ mt: 4 }} spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent='center'>
            <DisplayCard
              title="Kari's Expenses"
              amount={expensesData ? formatNumber(expensesData.kari) : '0,00'}
              color='success'
            />
            <DisplayCard
              title="Adolfo's Expenses"
              amount={expensesData ? formatNumber(expensesData.adolfo) : '0,00'}
              color='info'
            />
            <DisplayCard
              title='Total Expenses'
              amount={expensesData ? formatNumber(expensesData.total) : '0,00'}
              color='primary'
            />
          </Stack>
          {/* Debts */}
          <Stack sx={{ mt: 4 }} spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent='center'>
            <DisplayCard title="Kari's Debt" amount={debtData ? formatNumber(debtData.kari) : '0,00'} color='success' />
            <DisplayCard
              title="Adolfo's Debt"
              amount={debtData ? formatNumber(debtData.adolfo) : '0,00'}
              color='info'
            />
          </Stack>
          {/* Savings */}
          {hasSavingsData && (
            <Stack sx={{ mt: 4 }} spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent='center'>
              <DisplayCard
                title="Kari's Savings"
                amount={formatNumber(savingsTotals.kari)}
                percentage={formatNumber(savingsTotals.kariPercentage)}
                color='success'
                currencySymbol='€'
              />
              <DisplayCard
                title="Adolfo's Savings"
                amount={formatNumber(savingsTotals.adolfo)}
                percentage={formatNumber(savingsTotals.adolfoPercentage)}
                color='info'
                currencySymbol='€'
              />
              <DisplayCard
                title='Total Savings'
                amount={formatNumber(savingsTotals.total)}
                percentage={formatNumber(100)}
                color='primary'
                currencySymbol='€'
              />
            </Stack>
          )}
        </>
      )}
    </Container>
  );
};

export default Dashboard;
