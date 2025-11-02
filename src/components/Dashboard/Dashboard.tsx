import { useEffect, useMemo, useState } from 'react';
import { Box, Container, Stack, IconButton, Tooltip, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DownloadIcon from '@mui/icons-material/Download';
import DisplayCard from './DisplayCard';
import FullLoader from '../Loader/FullLoader';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Income, TotalExpenses, TotalDebt, Saving } from '../../interfaces';
import { useNotifications } from '../../context';
import { useExportDatabaseMutation } from '../../api/db/db';
import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';
import { buildRatesMap } from '../../utils/currency';
import { formatDecimal, formatDecimalInput, formatPercentage, parseDecimal } from '../../utils/number';
import { calculateSavingsSummary, getLatestSavingsGroup, groupSavingsByDate } from '../../utils/savings';

type DashboardCardConfig = {
  key: string;
  title: string;
  amount: string;
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning';
  percentage?: string;
  currencySymbol?: string;
  editKey?: 'kari' | 'adolfo';
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
    const parsedValue = parseDecimal(tempValue);
    if (parsedValue === null) {
      return;
    }

    const newValue = parsedValue;
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

  const handleEdit = (person: 'kari' | 'adolfo') => {
    if (!incomeData) {
      return;
    }

    setEditing(person);
    const currentValue = person === 'kari' ? incomeData.kari_income : incomeData.adolfo_income;
    setTempValue(
      typeof currentValue === 'number' && Number.isFinite(currentValue) ? formatDecimalInput(currentValue) : '',
    );
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

  const savingsTotals = useMemo(() => {
    const groups = groupSavingsByDate(savingsData);
    const latestGroup = getLatestSavingsGroup(groups);
    return calculateSavingsSummary(latestGroup?.savings ?? [], currencyRates);
  }, [savingsData, currencyRates]);

  const incomeCards = useMemo<DashboardCardConfig[]>(() => {
    if (!incomeData) {
      return [];
    }

    return [
      {
        key: 'kari-income',
        title: "Kari's Income",
        amount: formatDecimal(incomeData.kari_income ?? 0),
        percentage: formatDecimal(incomeData.kari_percentage ?? 0),
        color: 'success',
        editKey: 'kari',
      },
      {
        key: 'adolfo-income',
        title: "Adolfo's Income",
        amount: formatDecimal(incomeData.adolfo_income ?? 0),
        percentage: formatDecimal(incomeData.adolfo_percentage ?? 0),
        color: 'info',
        editKey: 'adolfo',
      },
      {
        key: 'total-income',
        title: 'Total Income',
        amount: formatDecimal(incomeData.total_income ?? 0),
        percentage: formatDecimal(100),
        color: 'primary',
      },
    ];
  }, [incomeData]);

  const expenseCards = useMemo<DashboardCardConfig[]>(() => {
    if (!expensesData) {
      return [];
    }

    return [
      {
        key: 'kari-expenses',
        title: "Kari's Expenses",
        amount: formatDecimal(expensesData.kari ?? 0),
        color: 'success',
      },
      {
        key: 'adolfo-expenses',
        title: "Adolfo's Expenses",
        amount: formatDecimal(expensesData.adolfo ?? 0),
        color: 'info',
      },
      {
        key: 'total-expenses',
        title: 'Total Expenses',
        amount: formatDecimal(expensesData.total ?? 0),
        color: 'primary',
      },
    ];
  }, [expensesData]);

  const debtCards = useMemo<DashboardCardConfig[]>(() => {
    if (!debtData) {
      return [];
    }

    return [
      {
        key: 'kari-debt',
        title: "Kari's Debt",
        amount: formatDecimal(debtData.kari ?? 0),
        color: 'success',
      },
      {
        key: 'adolfo-debt',
        title: "Adolfo's Debt",
        amount: formatDecimal(debtData.adolfo ?? 0),
        color: 'info',
      },
    ];
  }, [debtData]);

  const savingsCards = useMemo<DashboardCardConfig[]>(() => {
    if (!savingsData.length) {
      return [];
    }

    return [
      {
        key: 'kari-savings',
        title: "Kari's Savings",
        amount: formatDecimal(savingsTotals.kari),
        percentage: formatPercentage(savingsTotals.kariPercentage),
        color: 'success',
        currencySymbol: '€',
      },
      {
        key: 'adolfo-savings',
        title: "Adolfo's Savings",
        amount: formatDecimal(savingsTotals.adolfo),
        percentage: formatPercentage(savingsTotals.adolfoPercentage),
        color: 'info',
        currencySymbol: '€',
      },
      {
        key: 'total-savings',
        title: 'Total Savings',
        amount: formatDecimal(savingsTotals.total),
        percentage: formatPercentage(100),
        color: 'primary',
        currencySymbol: '€',
      },
    ];
  }, [savingsTotals]);

  const renderCardRow = (cards: DashboardCardConfig[], emptyMessage: string) => {
    if (!cards.length) {
      return (
        <Typography color='text.secondary' textAlign='center'>
          {emptyMessage}
        </Typography>
      );
    }

    return (
      <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent='center'>
        {cards.map((card) => {
          const editKey = card.editKey;

          return (
            <DisplayCard
              key={card.key}
              title={card.title}
              amount={card.amount}
              percentage={card.percentage}
              color={card.color}
              currencySymbol={card.currencySymbol ?? '$'}
              editing={editKey ? editing === editKey : undefined}
              onEdit={editKey ? () => handleEdit(editKey) : undefined}
              onSave={editKey ? handleSave : undefined}
              onCancel={editKey ? handleCancel : undefined}
              onChange={editKey ? handleInputChange : undefined}
              tempValue={editKey ? tempValue : undefined}
            />
          );
        })}
      </Stack>
    );
  };

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
          {renderCardRow(incomeCards, 'No income data available yet.')}

          {/* Expenses */}
          <Box sx={{ mt: 4 }}>{renderCardRow(expenseCards, 'No expenses data available yet.')}</Box>

          {/* Debts */}
          <Box sx={{ mt: 4 }}>{renderCardRow(debtCards, 'No debt data available yet.')}</Box>

          {/* Savings */}
          <Box sx={{ mt: 4 }}>{renderCardRow(savingsCards, 'No savings data available yet.')}</Box>
        </>
      )}
    </Container>
  );
};

export default Dashboard;
