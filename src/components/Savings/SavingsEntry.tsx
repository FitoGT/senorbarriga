import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
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

const SavingsEntry = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { showNotification } = useNotifications();
  const { data: savings, isLoading, error } = useGetAllSavings();
  const { mutateAsync: saveSavingsSnapshot, isPending } = useInsertSavingsMutation();
  const { date: dateParam } = useParams<{ date?: string }>();

  const editingDateKey = dateParam ? decodeURIComponent(dateParam) : null;
  const isEditing = Boolean(editingDateKey);

  const snapshotData = useMemo(() => {
    const groups = groupSavingsByDate(savings ?? []);
    const latestGroup = getLatestSavingsGroup(groups);
    const targetGroup = editingDateKey ? groups.find((group) => group.dateKey === editingDateKey) : latestGroup;
    const dateKeys = new Set(groups.map((group) => group.dateKey));

    return {
      groups,
      latestGroup,
      targetGroup,
      dateKeys,
    };
  }, [editingDateKey, savings]);

  const { latestGroup, targetGroup, dateKeys } = snapshotData;

  const fallbackDate = useMemo(() => today(), []);
  const defaultDate = isEditing ? (editingDateKey ?? fallbackDate) : (latestGroup?.dateKey ?? fallbackDate);

  const duplicateDateKeys = useMemo(() => {
    const keys = new Set(dateKeys);
    if (editingDateKey) {
      keys.delete(editingDateKey);
    }
    return keys;
  }, [dateKeys, editingDateKey]);

  const seedSavings = useMemo<Saving[]>(() => {
    if (targetGroup?.savings?.length) {
      return targetGroup.savings;
    }
    if (latestGroup?.savings?.length) {
      return latestGroup.savings;
    }
    return [] as Saving[];
  }, [latestGroup, targetGroup]);

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
          originalDate: editingDateKey ?? undefined,
        });
        navigate(ROUTES.SAVINGS);
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : String(submitError);
        showNotification(`Error saving savings: ${message}`, 'error');
      }
    },
    [duplicateDateKeys, editingDateKey, fieldsWithState, navigate, saveSavingsSnapshot, setError, showNotification],
  );

  const handleCancel = useCallback(() => {
    navigate(ROUTES.SAVINGS);
  }, [navigate]);

  if (isLoading) {
    return <FullLoader />;
  }

  if (isEditing && !targetGroup) {
    return (
      <Container
        maxWidth='sm'
        sx={{
          mt: 10,
          mb: 10,
          backgroundColor: theme.palette.background.paper,
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Stack spacing={3} alignItems='flex-start'>
          <Typography variant='h5' fontWeight='bold' color='text.primary'>
            Snapshot not found
          </Typography>
          <Typography color='text.secondary'>We could not find a savings snapshot for the selected date.</Typography>
          <Button variant='contained' color='primary' onClick={() => navigate(ROUTES.SAVINGS)}>
            Go back to savings
          </Button>
        </Stack>
      </Container>
    );
  }
  return (
    <Container
      maxWidth='sm'
      sx={{
        mt: 10,
        mb: 10,
        backgroundColor: theme.palette.background.paper,
        p: 3,
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Stack spacing={3}>
        <Typography variant='h5' fontWeight='bold' color='text.primary'>
          {isEditing ? 'Edit Savings Snapshot' : 'Add Savings Snapshot'}
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

          {[SavingUser.ADOLFO, SavingUser.KARI].map((user) => (
            <Stack key={user} spacing={2} sx={{ mt: 3 }}>
              <Typography variant='subtitle1' fontWeight='bold' color='text.secondary'>
                {SAVING_USER_LABELS[user]}
              </Typography>
              {fieldsWithState
                .filter((field) => field.user === user)
                .map((field) => (
                  <TextField
                    key={field.name}
                    label={`${SAVING_TYPE_LABELS[field.type]} (${field.currency})`}
                    fullWidth
                    margin='normal'
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

          <Box mt={4} display='flex' gap={2}>
            <IconButton
              color='success'
              onClick={handleSubmit(onSubmit)}
              disabled={isPending}
              sx={{ flexGrow: 1, border: '1px solid', borderRadius: '8px', p: 1 }}
            >
              {isPending ? <CircularProgress size={24} color='inherit' /> : <CheckIcon />}
            </IconButton>
            <IconButton
              color='error'
              onClick={handleCancel}
              sx={{ flexGrow: 1, border: '1px solid', borderRadius: '8px', p: 1 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </Stack>
    </Container>
  );
};

export default SavingsEntry;
