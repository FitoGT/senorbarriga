import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FullLoader from '../Loader/FullLoader';
import { useNotifications } from '../../context';
import { useGetAllSavings, useInsertSavingsMutation } from '../../api/savings/savings';
import { Currencies, Saving, SavingInsert, SavingType, SavingUser } from '../../interfaces';
import { ROUTES } from '../../constants/routes';
import { SAVING_TYPE_LABELS, SAVING_USER_LABELS } from '../../constants/savings';
import { DATE_DISPLAY_FORMAT, formatDate, isValidDateString, parseForDateInput, today } from '../../utils/date';
import { normalizeDecimalInput, parseDecimal, toFixedString } from '../../utils/number';
import { getLatestSavingsGroup, groupSavingsByDate } from '../../utils/savings';

const DEFAULT_TIMESTAMP_HOUR = '12:00:00Z';

type SavingsFieldName =
  | 'adolfoCash'
  | 'adolfoOceanBank'
  | 'adolfoFacebank'
  | 'adolfoN26'
  | 'kariCash'
  | 'kariSabadell'
  | 'kariWise';

type SavingsFormValues = {
  date: string;
} & Record<SavingsFieldName, string>;

type SavingsFieldConfig = {
  name: SavingsFieldName;
  user: SavingUser;
  type: SavingType;
  defaultCurrency: Currencies;
};

type SavingsFieldState = SavingsFieldConfig & {
  currency: Currencies;
  defaultAmount: number | null;
};

const FIELD_CONFIGS: SavingsFieldConfig[] = [
  { name: 'adolfoCash', user: SavingUser.ADOLFO, type: SavingType.CASH, defaultCurrency: Currencies.USD },
  { name: 'adolfoOceanBank', user: SavingUser.ADOLFO, type: SavingType.OCEAN_BANK, defaultCurrency: Currencies.USD },
  { name: 'adolfoFacebank', user: SavingUser.ADOLFO, type: SavingType.FACEBANK, defaultCurrency: Currencies.USD },
  { name: 'adolfoN26', user: SavingUser.ADOLFO, type: SavingType.N26, defaultCurrency: Currencies.EUR },
  { name: 'kariCash', user: SavingUser.KARI, type: SavingType.CASH, defaultCurrency: Currencies.USD },
  { name: 'kariSabadell', user: SavingUser.KARI, type: SavingType.SABADELL, defaultCurrency: Currencies.EUR },
  { name: 'kariWise', user: SavingUser.KARI, type: SavingType.WISE, defaultCurrency: Currencies.USD },
];

const amountSchema = z
  .string()
  .min(1, 'Amount is required')
  .refine((value) => {
    const parsed = parseDecimal(value);
    return parsed !== null && parsed >= 0;
  }, 'Amount must be a valid number greater than or equal to 0');

const formSchemaShape: Record<SavingsFieldName, typeof amountSchema> = FIELD_CONFIGS.reduce(
  (shape, field) => ({
    ...shape,
    [field.name]: amountSchema,
  }),
  {} as Record<SavingsFieldName, typeof amountSchema>,
);

const formSchema = z.object({
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((value) => isValidDateString(value), 'Invalid date format (YYYY-MM-DD required)'),
  ...formSchemaShape,
});

interface SavingsEntryProps {
  embedded?: boolean;
}

const SavingsEntry = ({ embedded = false }: SavingsEntryProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { showNotification } = useNotifications();
  const { data: savings, isLoading, error } = useGetAllSavings();
  const { mutateAsync: saveSavingsSnapshot, isPending } = useInsertSavingsMutation();
  const snapshotData = useMemo(() => {
    const groups = groupSavingsByDate(savings ?? []);
    const latestGroup = getLatestSavingsGroup(groups);
    const dateKeys = new Set(groups.map((group) => group.dateKey));

    return {
      groups,
      latestGroup,
      dateKeys,
    };
  }, [savings]);

  const { latestGroup, dateKeys } = snapshotData;

  const fallbackDate = useMemo(() => today(), []);
  const defaultDate = fallbackDate;

  const duplicateDateKeys = useMemo(() => new Set(dateKeys), [dateKeys]);

  const seedSavings = useMemo<Saving[]>(() => {
    if (latestGroup?.savings?.length) {
      return latestGroup.savings;
    }
    return [] as Saving[];
  }, [latestGroup]);

  const fieldsWithState = useMemo<SavingsFieldState[]>(() => {
    const latestMap = new Map<string, { amount: number; currency: Currencies | null }>();

    for (const saving of seedSavings) {
      if (!saving.user || !saving.type) {
        continue;
      }

      const key = `${saving.user}-${saving.type}`;
      latestMap.set(key, {
        amount: typeof saving.amount === 'number' ? saving.amount : Number(saving.amount ?? 0),
        currency: saving.currency ?? null,
      });
    }

    return FIELD_CONFIGS.map((field) => {
      const key = `${field.user}-${field.type}`;
      const latest = latestMap.get(key);
      const resolvedCurrency = latest?.currency || field.defaultCurrency;

      return {
        ...field,
        currency: resolvedCurrency,
        defaultAmount: latest ? (latest.amount ?? 0) : null,
      };
    });
  }, [seedSavings]);

  const defaultValues = useMemo<SavingsFormValues>(() => {
    const base: Partial<SavingsFormValues> = { date: defaultDate };

    for (const field of fieldsWithState) {
      base[field.name] = field.defaultAmount !== null ? toFixedString(field.defaultAmount) : '';
    }

    return base as SavingsFormValues;
  }, [defaultDate, fieldsWithState]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    getValues,
    formState: { errors },
  } = useForm<SavingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (error) {
      showNotification(`Error retrieving savings: ${error}`, 'error');
    }
  }, [error, showNotification]);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleAmountChange = useCallback(
    (fieldName: SavingsFieldName, raw: string) => {
      const cleaned = normalizeDecimalInput(raw);
      setValue(fieldName, cleaned, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const handleAmountBlur = useCallback(
    (fieldName: SavingsFieldName) => {
      const currentValue = normalizeDecimalInput(getValues(fieldName) ?? '');
      const parsed = parseDecimal(currentValue);

      if (parsed !== null) {
        setValue(fieldName, toFixedString(parsed), { shouldDirty: true, shouldValidate: true });
      }
    },
    [getValues, setValue],
  );

  const onSubmit = useCallback(
    async (values: SavingsFormValues) => {
      const formattedDate = formatDate(values.date);

      if (!formattedDate) {
        showNotification('Invalid date provided', 'error');
        return;
      }

      if (duplicateDateKeys.has(formattedDate)) {
        setError('date', {
          type: 'manual',
          message: 'A savings snapshot already exists for this date.',
        });
        showNotification('A savings snapshot already exists for this date.', 'error');
        return;
      }

      const sharedTimestamp = `${formattedDate}T${DEFAULT_TIMESTAMP_HOUR}`;

      const payload: SavingInsert[] = fieldsWithState.map((field) => {
        const amount = parseDecimal(values[field.name]);

        return {
          // eslint-disable-next-line camelcase
          created_at: sharedTimestamp,
          user: field.user,
          type: field.type,
          amount: amount ?? 0,
          currency: field.currency,
        };
      });

      try {
        await saveSavingsSnapshot({
          entries: payload,
        });
        if (!embedded) {
          navigate(ROUTES.SAVINGS);
        }
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : String(submitError);
        showNotification(`Error saving savings: ${message}`, 'error');
      }
    },
    [duplicateDateKeys, embedded, fieldsWithState, navigate, saveSavingsSnapshot, setError, showNotification],
  );

  const handleCancel = useCallback(() => {
    reset(defaultValues);
    if (!embedded) {
      navigate(ROUTES.SAVINGS);
    }
  }, [defaultValues, embedded, navigate, reset]);

  if (isLoading) {
    return <FullLoader />;
  }

  return (
    <Container
      maxWidth={embedded ? false : 'sm'}
      sx={{
        mt: embedded ? 0 : 2,
        mb: embedded ? 0 : 5,
        backgroundColor: theme.palette.background.paper,
        p: 3,
        borderRadius: '26px',
        boxShadow: '0 14px 34px rgba(0,0,0,.3)',
        maxWidth: embedded ? 'none' : undefined,
      }}
    >
      <Stack spacing={3}>
        <Typography variant='h5' fontWeight='bold' color='text.primary'>
          New savings snapshot
        </Typography>

        <Box component='form' onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name='date'
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                label='Date'
                value={parseForDateInput(field.value)}
                onChange={(newDate) =>
                  setValue('date', formatDate(newDate), { shouldDirty: true, shouldValidate: true })
                }
                format={DATE_DISPLAY_FORMAT}
                slotProps={{
                  textField: {
                    variant: 'outlined',
                    fullWidth: true,
                    margin: 'normal',
                    error: !!errors.date,
                    helperText: errors.date?.message,
                  },
                }}
              />
            )}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(300px,100%),1fr))', gap: 1.75, mt: 2 }}>
          {[SavingUser.KARI, SavingUser.ADOLFO].map((user) => (
            <Stack key={user} spacing={1.25} sx={{ p: 2.25, bgcolor: '#171920', borderRadius: '20px' }}>
              <Box display='flex' alignItems='center' gap={1}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: user === SavingUser.KARI ? 'success.main' : 'info.main' }} />
              <Typography variant='subtitle1' fontWeight='bold' color={user === SavingUser.KARI ? 'success.main' : 'info.main'}>
                {SAVING_USER_LABELS[user]}
              </Typography>
              </Box>
              {fieldsWithState
                .filter((field) => field.user === user)
                .map((field) => (
                  <TextField
                    key={field.name}
                    label={`${SAVING_TYPE_LABELS[field.type]} (${field.currency})`}
                    fullWidth
                    type='text'
                    inputMode='decimal'
                    {...register(field.name)}
                    onChange={(event) => handleAmountChange(field.name, event.target.value)}
                    onBlur={() => handleAmountBlur(field.name)}
                    error={!!errors[field.name]}
                    helperText={errors[field.name]?.message}
                    sx={{
                      input: { color: theme.palette.text.primary },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: theme.palette.divider },
                        '&:hover fieldset': { borderColor: theme.palette.primary.main },
                        '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                      },
                    }}
                  />
                ))}
            </Stack>
          ))}
          </Box>

          <Box mt={4} display='flex' gap={2}>
            <Button
              variant='contained'
              onClick={handleSubmit(onSubmit)}
              disabled={isPending}
              sx={{ flexGrow: 1 }}
            >
              {isPending ? <CircularProgress size={24} color='inherit' /> : 'Save snapshot'}
            </Button>
            <Button
              variant='outlined'
              color='inherit'
              onClick={handleCancel}
              sx={{ borderColor: '#333846', color: 'text.secondary' }}
            >
              {embedded ? 'Reset' : 'Cancel'}
            </Button>
          </Box>
        </Box>
      </Stack>
    </Container>
  );
};

export default SavingsEntry;
