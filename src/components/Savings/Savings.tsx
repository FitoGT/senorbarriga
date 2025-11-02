import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Container,
  Stack,
  Typography,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  IconButton,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FullLoader from '../Loader/FullLoader';
import { useNotifications } from '../../context';
import { useDeleteSavingsGroupMutation, useGetAllSavings } from '../../api/savings/savings';
import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';
import DisplayCard from '../Dashboard/DisplayCard';
import { Currencies, SavingType, SavingUser } from '../../interfaces';
import SavingsAccordion from './SavingsAccordion';
import SavingsDeleteDialog from './SavingsDeleteDialog';
import { SAVING_TYPE_LABELS, SAVING_USER_LABELS } from '../../constants/savings';
import { buildRatesMap, convertToEuro, needsConversion } from '../../utils/currency';
import { formatCurrency as formatCurrencyValue, formatDecimal, formatPercentage } from '../../utils/number';
import { calculateSavingsSummary, getLatestSavingsGroup, groupSavingsByDate } from '../../utils/savings';
import { formatDateWithFallback } from '../../utils/date';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

type AccountSummary = {
  type: SavingType;
  user: SavingUser;
  amount: number;
  currency: Currencies | null;
};

const ADOLFO_ACCOUNT_ORDER: SavingType[] = [
  SavingType.CASH,
  SavingType.OCEAN_BANK,
  SavingType.FACEBANK,
  SavingType.N26,
];

const KARI_ACCOUNT_ORDER: SavingType[] = [SavingType.CASH, SavingType.SABADELL, SavingType.WISE];

const Savings = () => {
  const { showNotification } = useNotifications();
  const navigate = useNavigate();
  const { data: savings, isLoading, error } = useGetAllSavings();
  const { mutate: deleteSavingsGroup, isPending: isDeleting } = useDeleteSavingsGroupMutation();
  const {
    data: exchangeRate,
    isLoading: isExchangeRateLoading,
    error: exchangeRateError,
  } = useGetCurrentExchangeRate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [deleteTarget, setDeleteTarget] = useState<{ dateKey: string; label: string } | null>(null);

  const currencyRates = useMemo(() => buildRatesMap(exchangeRate), [exchangeRate]);

  const { latestSavings, latestDateKey, historicalGroups } = useMemo(() => {
    const groups = groupSavingsByDate(savings ?? []);
    const latestGroup = getLatestSavingsGroup(groups);

    return {
      latestSavings: latestGroup ? latestGroup.savings : [],
      latestDateKey: latestGroup ? latestGroup.dateKey : null,
      historicalGroups: latestGroup ? groups.slice(1) : groups,
    };
  }, [savings]);

  const latestDateLabel = useMemo(() => formatDateWithFallback(latestDateKey), [latestDateKey]);

  const needsExchangeRate = useMemo(
    () => (savings ?? []).some((saving) => needsConversion(saving.currency)),
    [savings],
  );

  const isDataLoading = isLoading || (needsExchangeRate && isExchangeRateLoading);

  const formatCurrency = useCallback(
    (amount: number, currency: Currencies | null) =>
      formatCurrencyValue(amount ?? 0, (currency ?? Currencies.EUR) as string),
    [],
  );

  const formatEURAmount = useCallback((value: number) => formatDecimal(value ?? 0), []);

  const convertToEUR = useCallback(
    (amount: number, currency: Currencies | null) => convertToEuro(amount, currency, currencyRates),
    [currencyRates],
  );

  const handleAddSavings = useCallback(() => {
    navigate(ROUTES.SAVINGS_ENTRY);
  }, [navigate]);

  const handleEditSavings = useCallback(
    (dateKey: string) => {
      navigate(`${ROUTES.SAVINGS_EDIT}${encodeURIComponent(dateKey)}`);
    },
    [navigate],
  );

  const handleDeletePrompt = useCallback((dateKey: string) => {
    const label = formatDateWithFallback(dateKey, dateKey);
    setDeleteTarget({ dateKey, label });
  }, []);

  const handleCloseDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) {
      return;
    }

    deleteSavingsGroup(deleteTarget.dateKey, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
      onError: (deleteError) => {
        const message = deleteError instanceof Error ? deleteError.message : String(deleteError);
        showNotification(`Error deleting savings: ${message}`, 'error');
      },
    });
  }, [deleteSavingsGroup, deleteTarget, showNotification]);

  const groupedAccounts = useMemo(() => {
    const seed = {
      adolfo: new Map<SavingType, AccountSummary>(),
      kari: new Map<SavingType, AccountSummary>(),
    } as const;

    if (!latestSavings.length) {
      return {
        adolfo: [],
        kari: [],
      };
    }

    for (const saving of latestSavings) {
      if (!saving.type || !saving.user) {
        continue;
      }

      const map = saving.user === SavingUser.ADOLFO ? seed.adolfo : saving.user === SavingUser.KARI ? seed.kari : null;

      if (!map) {
        continue;
      }

      const existing = map.get(saving.type);
      if (existing) {
        existing.amount += saving.amount ?? 0;
      } else {
        map.set(saving.type, {
          type: saving.type,
          user: saving.user,
          amount: saving.amount ?? 0,
          currency: saving.currency ?? Currencies.EUR,
        });
      }
    }

    const ensureOrder = (map: Map<SavingType, AccountSummary>, order: SavingType[]) =>
      order.map((type) => map.get(type)).filter((entry): entry is AccountSummary => Boolean(entry));

    return {
      adolfo: ensureOrder(seed.adolfo, ADOLFO_ACCOUNT_ORDER),
      kari: ensureOrder(seed.kari, KARI_ACCOUNT_ORDER),
    };
  }, [latestSavings]);

  const savingsTotals = useMemo(
    () => calculateSavingsSummary(latestSavings, currencyRates),
    [latestSavings, currencyRates],
  );

  useEffect(() => {
    if (error) {
      showNotification(`Error retrieving savings: ${error}`, 'error');
    }
  }, [error, showNotification]);

  useEffect(() => {
    if (exchangeRateError) {
      showNotification(`Error retrieving exchange rate: ${exchangeRateError}`, 'error');
    }
  }, [exchangeRateError, showNotification]);

  const renderAccountRow = (label: string, accounts: AccountSummary[]) => {
    if (!accounts.length) {
      return null;
    }

    return (
      <Stack spacing={2} key={label}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2, columnGap: 2 }}>
          {accounts.map((account) => (
            <Card
              key={`${account.type}-${account.user}`}
              elevation={3}
              sx={{
                backgroundColor: theme.palette.grey[900],
                color: theme.palette.text.primary,
                flex: '1 1 180px',
                minWidth: isSmallScreen ? '100%' : 180,
              }}
            >
              <CardContent>
                <Stack spacing={0.5}>
                  <Typography variant='h6' fontWeight='bold'>
                    {`${SAVING_USER_LABELS[account.user]}'s ${SAVING_TYPE_LABELS[account.type]}`}
                  </Typography>
                  <Typography variant='h5' color='primary' fontWeight='bold'>
                    {formatCurrency(account.amount, account.currency)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>
    );
  };

  return (
    <Container maxWidth='md' sx={{ mt: 8, mb: 8, px: { xs: 2, sm: 3 } }}>
      {isDataLoading ? (
        <FullLoader />
      ) : (
        <Stack spacing={4} sx={{ mt: 4 }}>
          <Stack spacing={0.5}>
            <Box display='flex' alignItems='center' justifyContent='space-between'>
              <Typography variant='h5' fontWeight='bold' color='text.primary'>
                Savings
              </Typography>
              <Stack direction='row' spacing={1} alignItems='center'>
                {latestDateLabel && latestDateKey && (
                  <>
                    <IconButton
                      color='primary'
                      onClick={() => handleEditSavings(latestDateKey)}
                      aria-label='Edit latest savings snapshot'
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color='error'
                      onClick={() => handleDeletePrompt(latestDateKey)}
                      aria-label='Delete latest savings snapshot'
                    >
                      <DeleteIcon />
                    </IconButton>
                  </>
                )}
                <IconButton color='primary' onClick={handleAddSavings} aria-label='Add savings snapshot'>
                  <AddIcon />
                </IconButton>
              </Stack>
            </Box>
            {latestDateLabel && (
              <Typography variant='body2' color='text.secondary'>
                Last updated: {latestDateLabel}
              </Typography>
            )}
          </Stack>

          {(!savings || savings.length === 0) && (
            <Typography color='text.secondary'>No savings recorded yet.</Typography>
          )}

          {latestSavings.length > 0 && (
            <Stack spacing={3}>
              {renderAccountRow('Adolfo', groupedAccounts.adolfo)}
              {renderAccountRow('Kari', groupedAccounts.kari)}
            </Stack>
          )}

          {latestSavings.length > 0 && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack spacing={3} direction={{ xs: 'column', md: 'row' }} sx={{ alignItems: 'stretch' }}>
                <DisplayCard
                  title='Kari Savings'
                  amount={formatEURAmount(savingsTotals.kari)}
                  percentage={formatPercentage(savingsTotals.kariPercentage)}
                  color='success'
                  currencySymbol='€'
                />
                <DisplayCard
                  title='Adolfo Savings'
                  amount={formatEURAmount(savingsTotals.adolfo)}
                  percentage={formatPercentage(savingsTotals.adolfoPercentage)}
                  color='info'
                  currencySymbol='€'
                />
                <DisplayCard
                  title='Total Savings'
                  amount={formatEURAmount(savingsTotals.total)}
                  percentage={formatPercentage(100)}
                  color='primary'
                  currencySymbol='€'
                />
              </Stack>
            </Stack>
          )}

          {historicalGroups.length > 0 && (
            <Stack spacing={2} sx={{ pt: 2 }}>
              <Typography variant='h6' fontWeight='bold' color='text.primary'>
                Savings history
              </Typography>
              {historicalGroups.map((group) => (
                <SavingsAccordion
                  key={group.dateKey}
                  dateKey={group.dateKey}
                  displayDate={formatDateWithFallback(group.dateKey, group.dateKey)}
                  savings={group.savings}
                  formatCurrency={formatCurrency}
                  convertToEUR={convertToEUR}
                  currencyRates={currencyRates}
                  onEdit={() => handleEditSavings(group.dateKey)}
                  onDelete={() => handleDeletePrompt(group.dateKey)}
                />
              ))}
            </Stack>
          )}
        </Stack>
      )}
      <SavingsDeleteDialog
        open={Boolean(deleteTarget)}
        dateLabel={deleteTarget?.label ?? ''}
        loading={isDeleting}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />
    </Container>
  );
};

export default Savings;
