import { Accordion, AccordionSummary, AccordionDetails, Stack, Typography, useTheme, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMemo } from 'react';
import { Currencies, Saving, SavingUser, SavingType } from '../../interfaces';
import { SAVING_TYPE_LABELS, SAVING_USER_LABELS } from '../../constants/savings';
import { formatCurrency as formatCurrencyValue } from '../../utils/number';
import { calculateSavingsSummary } from '../../utils/savings';
import { CurrencyRateMap } from '../../utils/currency';
import { formatTimeWithFallback } from '../../utils/date';

interface SavingsAccordionProps {
  dateKey: string;
  displayDate: string;
  savings: Saving[];
  formatCurrency: (amount: number, currency: Currencies | null) => string;
  convertToEUR: (amount: number, currency: Currencies | null) => number;
  currencyRates: CurrencyRateMap;
  onEdit?: () => void;
  onDelete?: () => void;
}

const SavingsAccordion = ({
  dateKey,
  displayDate,
  savings,
  formatCurrency: formatCurrencyFn,
  convertToEUR,
  currencyRates,
  onEdit,
  onDelete,
}: SavingsAccordionProps) => {
  const theme = useTheme();

  const totals = useMemo(() => calculateSavingsSummary(savings, currencyRates), [currencyRates, savings]);
  const hasActions = Boolean(onEdit || onDelete);

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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          width='100%'
          justifyContent='space-between'
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Stack direction='row' spacing={1} alignItems='center'>
            <Typography variant='body1' fontWeight='bold'>
              {displayDate}
            </Typography>
            {hasActions && (
              <Stack direction='row' spacing={0.5} alignItems='center'>
                {onEdit && (
                  <IconButton
                    size='small'
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit();
                    }}
                    aria-label={`Edit savings snapshot from ${displayDate}`}
                    sx={{ color: theme.palette.primary.main }}
                  >
                    <EditIcon fontSize='small' />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton
                    size='small'
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete();
                    }}
                    aria-label={`Delete savings snapshot from ${displayDate}`}
                    sx={{ color: theme.palette.error.main }}
                  >
                    <DeleteIcon fontSize='small' />
                  </IconButton>
                )}
              </Stack>
            )}
          </Stack>
          <Stack direction='row' spacing={2} justifyContent='flex-end'>
            <Typography variant='body2' color='text.secondary'>
              Kari: {formatCurrencyValue(totals.kari, Currencies.EUR)}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Adolfo: {formatCurrencyValue(totals.adolfo, Currencies.EUR)}
            </Typography>
            <Typography variant='body2' color={theme.palette.primary.main} fontWeight='bold'>
              Total: {formatCurrencyValue(totals.total, Currencies.EUR)}
            </Typography>
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          {savings.map((saving) => {
            const userLabel = SAVING_USER_LABELS[saving.user as SavingUser] || saving.user || '';
            const typeLabel = SAVING_TYPE_LABELS[saving.type as SavingType] || saving.type || '';
            const label = [userLabel, typeLabel].filter(Boolean).join(' · ');
            const eurAmount = convertToEUR(saving.amount ?? 0, saving.currency ?? Currencies.EUR);
            const showConversion = (saving.currency ?? Currencies.EUR) !== Currencies.EUR;
            const timeLabel = formatTimeWithFallback(saving.created_at);

            return (
              <Stack
                key={`${dateKey}-${saving.id}`}
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                sx={{
                  backgroundColor: theme.palette.grey[900],
                  borderRadius: 1,
                  px: 2,
                  py: 1.5,
                }}
              >
                <Stack spacing={0.5}>
                  <Typography variant='body2' fontWeight='bold'>
                    {label}
                  </Typography>
                  {timeLabel && (
                    <Typography variant='caption' color='text.secondary'>
                      {timeLabel}
                    </Typography>
                  )}
                </Stack>
                <Stack spacing={0.5} textAlign='right'>
                  <Typography variant='body1' color={theme.palette.primary.main} fontWeight='bold'>
                    {formatCurrencyFn(saving.amount ?? 0, saving.currency ?? Currencies.EUR)}
                  </Typography>
                  {showConversion && (
                    <Typography variant='caption' color='text.secondary'>
                      {formatCurrencyValue(eurAmount, Currencies.EUR)}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default SavingsAccordion;
