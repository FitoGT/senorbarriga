import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import FullLoader from '../Loader/FullLoader';
import SavingsEntry from './SavingsEntry';
import SavingsAccordion from './SavingsAccordion';
import SavingsDeleteDialog from './SavingsDeleteDialog';
import { useNotifications } from '../../context';
import { useDeleteSavingsGroupMutation, useGetAllSavings } from '../../api/savings/savings';
import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';
import { Currencies } from '../../interfaces';
import { buildRatesMap, convertToEuro } from '../../utils/currency';
import { formatCurrency as formatCurrencyValue } from '../../utils/number';
import { formatDateWithFallback } from '../../utils/date';
import { groupSavingsByDate } from '../../utils/savings';

const Savings = () => {
  const { showNotification } = useNotifications();
  const { data: savings, isLoading, error } = useGetAllSavings();
  const { data: exchangeRate, isLoading: rateLoading } = useGetCurrentExchangeRate();
  const { mutate: deleteSavingsGroup, isPending: isDeleting } = useDeleteSavingsGroupMutation();
  const [deleteTarget, setDeleteTarget] = useState<{ dateKey: string; label: string } | null>(null);
  const rates = useMemo(() => buildRatesMap(exchangeRate), [exchangeRate]);
  const groups = useMemo(() => groupSavingsByDate(savings ?? []), [savings]);
  const history = groups.slice(1);

  useEffect(() => {
    if (error) showNotification(`Error retrieving savings: ${error}`, 'error');
  }, [error, showNotification]);

  const formatCurrency = useCallback(
    (amount: number, currency: Currencies | null) => formatCurrencyValue(amount, currency ?? Currencies.EUR),
    [],
  );
  const convertToEUR = useCallback(
    (amount: number, currency: Currencies | null) => convertToEuro(amount, currency, rates),
    [rates],
  );

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteSavingsGroup(deleteTarget.dateKey, {
      onSuccess: () => setDeleteTarget(null),
      onError: (deleteError) => showNotification(`Error deleting savings: ${deleteError}`, 'error'),
    });
  };

  if (isLoading || rateLoading) return <FullLoader />;

  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, sm: 2.25 }, pt: 0.5, pb: 5 }}>
      <SavingsEntry embedded />
      <Typography variant='h5' sx={{ mt: 3.25, mb: 1.75, px: 0.5 }}>History</Typography>
      {history.length ? (
        <Stack spacing={1.5}>
          {history.map((group) => (
            <SavingsAccordion
              key={group.dateKey}
              dateKey={group.dateKey}
              displayDate={formatDateWithFallback(group.dateKey, group.dateKey)}
              savings={group.savings}
              formatCurrency={formatCurrency}
              convertToEUR={convertToEUR}
              currencyRates={rates}
              onDelete={() => setDeleteTarget({ dateKey: group.dateKey, label: formatDateWithFallback(group.dateKey) })}
            />
          ))}
        </Stack>
      ) : (
        <Box sx={{ p: 2.5, bgcolor: '#1e2027', borderRadius: '20px' }}>
          <Typography color='text.secondary'>No previous snapshots yet.</Typography>
        </Box>
      )}
      <SavingsDeleteDialog
        open={Boolean(deleteTarget)}
        dateLabel={deleteTarget?.label ?? ''}
        loading={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Container>
  );
};

export default Savings;
