import { Accordion, AccordionSummary, AccordionDetails, Stack, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMemo } from 'react';
import { Currencies, Saving, SavingUser, SavingType } from '../../interfaces';
import { SAVING_TYPE_LABELS, SAVING_USER_LABELS } from '../../constants/savings';

interface SavingsAccordionProps {
  dateKey: string;
  displayDate: string;
  savings: Saving[];
  formatCurrency: (amount: number, currency: Currencies | null) => string;
  convertToEUR: (amount: number, currency: Currencies | null) => number;
}

const formatEUR = (value: number): string =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const SavingsAccordion = ({ dateKey, displayDate, savings, formatCurrency, convertToEUR }: SavingsAccordionProps) => {
  const theme = useTheme();

  const totals = useMemo(() => {
    let kari = 0;
    let adolfo = 0;

    for (const saving of savings) {
      const eurAmount = convertToEUR(saving.amount ?? 0, saving.currency ?? Currencies.EUR);

      if (saving.user === SavingUser.KARI) {
        kari += eurAmount;
      }

      if (saving.user === SavingUser.ADOLFO) {
        adolfo += eurAmount;
      }
    }

    const total = kari + adolfo;

    return {
      kari,
      adolfo,
      total,
    };
  }, [convertToEUR, savings]);

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
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width='100%' justifyContent='space-between'>
          <Typography variant='body1' fontWeight='bold'>
            {displayDate}
          </Typography>
          <Stack direction='row' spacing={2} justifyContent='flex-end'>
            <Typography variant='body2' color='text.secondary'>
              Kari: {formatEUR(totals.kari)}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Adolfo: {formatEUR(totals.adolfo)}
            </Typography>
            <Typography variant='body2' color={theme.palette.primary.main} fontWeight='bold'>
              Total: {formatEUR(totals.total)}
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
            const createdAtDate = new Date(saving.created_at);
            const timeLabel = Number.isNaN(createdAtDate.getTime())
              ? null
              : createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
                    {formatCurrency(saving.amount ?? 0, saving.currency ?? Currencies.EUR)}
                  </Typography>
                  {showConversion && (
                    <Typography variant='caption' color='text.secondary'>
                      {formatEUR(eurAmount)}
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
