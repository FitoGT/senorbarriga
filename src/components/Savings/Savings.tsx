import { useCallback, useEffect, useMemo } from 'react';
import { Container, Stack, Typography, Card, CardContent, useTheme, useMediaQuery } from '@mui/material';
import FullLoader from '../Loader/FullLoader';
import { useNotifications } from '../../context';
import { useGetAllSavings } from '../../api/savings/savings';
import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';
import DisplayCard from '../Dashboard/DisplayCard';
import { Currencies, Saving, SavingType, SavingUser } from '../../interfaces';
import SavingsAccordion from './SavingsAccordion';
import { SAVING_TYPE_LABELS, SAVING_USER_LABELS } from '../../constants/savings';
import { buildRatesMap, convertToEuro, needsConversion } from '../../utils/currency';

type AccountSummary = {
  type: SavingType;
  user: SavingUser;
  amount: number;
  currency: Currencies | null;
};

type SavingsGroup = {
  dateKey: string;
  timestamp: number;
  savings: Saving[];
};

const parseDateKey = (createdAt: string): { key: string; timestamp: number } => {
  const parsed = new Date(createdAt);

  if (!Number.isNaN(parsed.getTime())) {
    return {
      key: parsed.toISOString().split('T')[0],
      timestamp: parsed.getTime(),
    };
  }

  return {
    key: createdAt,
    timestamp: 0,
  };
};

const formatDateLabel = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(parsed);
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
  const { data: savings, isLoading, error } = useGetAllSavings();
  const {
    data: exchangeRate,
    isLoading: isExchangeRateLoading,
    error: exchangeRateError,
  } = useGetCurrentExchangeRate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const currencyRates = useMemo(() => buildRatesMap(exchangeRate), [exchangeRate]);

  const { latestSavings, latestDateKey, historicalGroups } = useMemo(() => {
    if (!savings || savings.length === 0) {
      return {
        latestSavings: [] as Saving[],
        latestDateKey: null as string | null,
        historicalGroups: [] as SavingsGroup[],
      };
    }

    const groups = new Map<string, SavingsGroup>();

    for (const saving of savings) {
      const createdAt = saving.created_at ?? '';
      const { key, timestamp } = parseDateKey(createdAt);

      const existing = groups.get(key);

      if (existing) {
        existing.savings.push(saving);
        existing.timestamp = Math.max(existing.timestamp, timestamp);
      } else {
        groups.set(key, {
          dateKey: key,
          timestamp,
          savings: [saving],
        });
      }
    }

    const sorted = Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
    const [latest, ...rest] = sorted;

    return {
      latestSavings: latest ? latest.savings : [],
      latestDateKey: latest ? latest.dateKey : null,
      historicalGroups: rest,
    };
  }, [savings]);

  const latestDateLabel = useMemo(() => formatDateLabel(latestDateKey), [latestDateKey]);

  const needsExchangeRate = useMemo(
    () => (savings ?? []).some((saving) => needsConversion(saving.currency)),
    [savings],
  );

  const isDataLoading = isLoading || (needsExchangeRate && isExchangeRateLoading);

  const formatCurrency = useCallback((amount: number, currency: Currencies | null) => {
    const normalized = currency ?? Currencies.EUR;
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount ?? 0);
  }, []);

  const formatEURAmount = useCallback(
    (value: number) =>
      new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value ?? 0),
    [],
  );

  const convertToEUR = useCallback(
    (amount: number, currency: Currencies | null) => convertToEuro(amount, currency, currencyRates),
    [currencyRates],
  );

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

  const savingsTotals = useMemo(() => {
    let kariTotal = 0;
    let adolfoTotal = 0;

    for (const saving of latestSavings) {
      if (!saving.user) {
        continue;
      }

      const eurAmount = convertToEUR(saving.amount ?? 0, saving.currency ?? Currencies.EUR);

      if (saving.user === SavingUser.KARI) {
        kariTotal += eurAmount;
      }

      if (saving.user === SavingUser.ADOLFO) {
        adolfoTotal += eurAmount;
      }
    }

    const total = kariTotal + adolfoTotal;

    return {
      kari: kariTotal,
      adolfo: adolfoTotal,
      total,
      kariPercentage: total ? (kariTotal / total) * 100 : 0,
      adolfoPercentage: total ? (adolfoTotal / total) * 100 : 0,
    };
  }, [convertToEUR, latestSavings]);

  const formatPercentage = (value: number) => value.toFixed(2);

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
            <Typography variant='h5' fontWeight='bold' color='text.primary'>
              Savings
            </Typography>
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
                  percentage='100.00'
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
                  displayDate={formatDateLabel(group.dateKey) ?? group.dateKey}
                  savings={group.savings}
                  formatCurrency={formatCurrency}
                  convertToEUR={convertToEUR}
                />
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </Container>
  );
};

export default Savings;
