/* eslint-disable camelcase */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Container,
  TextField,
  Typography,
  CircularProgress,
  Box,
  FormControl,
  Switch,
  FormControlLabel,
  FormHelperText,
  useTheme,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import FullLoader from '../Loader/FullLoader';
import { ExpenseCategory, ExpenseType, Currencies } from '../../interfaces/';
import { useNotifications } from '../../context';
import { ROUTES } from '../../constants/routes';
import { useInsertEpenseMutation, useUpdateExpenseMutation, useGetExpenseById } from '../../api/expenses/expenses';
import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';
import { buildRatesMap, convertFromEuro, convertToEuro } from '../../utils/currency';
import { normalizeDecimalInput, parseDecimal, toFixedString } from '../../utils/number';
import { DATE_DISPLAY_FORMAT, formatDate, isValidDateString, parseForDateInput, today } from '../../utils/date';
import { CategoryTypeMap } from '../../interfaces/CategoryTypeMap';
const formSchema = z.object({
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((value) => isValidDateString(value), {
      message: 'Invalid date format (YYYY-MM-DD required)',
    }),
  description: z
    .string()
    .min(1, 'Description must be at least 1 character')
    .max(100, 'Description must be at most 100 characters'),
  usdAmount: z
    .string()
    .min(1, 'Amount (USD) is required')
    .refine((v) => !isNaN(parseFloat(v.replace(',', '.'))) && parseFloat(v.replace(',', '.')) > 0, {
      message: 'USD must be a valid number greater than 0',
    }),
  eurAmount: z
    .string()
    .refine((v) => v === '' || (!isNaN(parseFloat(v.replace(',', '.'))) && parseFloat(v.replace(',', '.')) > 0), {
      message: 'EUR must be a valid number greater than 0',
    })
    .optional()
    .default(''),
  category: z.nativeEnum(ExpenseCategory, { errorMap: () => ({ message: 'Category is required' }) }),
  type: z.nativeEnum(ExpenseType, { errorMap: () => ({ message: 'Type is required' }) }),
  isPaidByKari: z.boolean(),
  is_default: z.boolean(),
});

type ExpenseFormData = z.infer<typeof formSchema>;

interface ExpenseProps {
  embedded?: boolean;
  onSaved?: () => void | Promise<void>;
}

const Expense = ({ embedded = false, onSaved }: ExpenseProps) => {
  const { mutateAsync: insertExpense } = useInsertEpenseMutation();
  const { mutateAsync: updateExpense } = useUpdateExpenseMutation();
  const { data: exchangeData } = useGetCurrentExchangeRate();

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const { id } = useParams();
  const { showNotification } = useNotifications();
  const expenseId = Number(id);
  const shouldFetch = Number.isFinite(expenseId);

  const { data: expense, isPending } = useGetExpenseById(expenseId);
  const showLoader = shouldFetch && isPending;

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    getValues,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: today(),
      isPaidByKari: false,
      category: ExpenseCategory.FOOD,
      type: ExpenseType.PERCENTAGE,
      usdAmount: '',
      eurAmount: '',
      is_default: false,
    },
  });

  const currencyRates = useMemo(() => buildRatesMap(exchangeData), [exchangeData]);
  const usdPerEur = currencyRates[Currencies.USD];
  const selectedCategory = useWatch({ control, name: 'category' });

  const normalizeCategoryKey = (c: unknown) =>
    String(c ?? '')
      .trim()
      .toLowerCase();

  const handleUsdChange = (raw: string) => {
    const cleaned = normalizeDecimalInput(raw);
    setValue('usdAmount', cleaned, { shouldDirty: true, shouldValidate: true });

    const num = parseDecimal(cleaned);
    if (!usdPerEur || num === null) {
      setValue('eurAmount', '', { shouldDirty: true, shouldValidate: true });
      return;
    }
    const eur = convertToEuro(num, Currencies.USD, currencyRates);
    setValue('eurAmount', toFixedString(eur), { shouldDirty: true, shouldValidate: true });
  };

  const handleEurChange = (raw: string) => {
    const cleaned = normalizeDecimalInput(raw);
    setValue('eurAmount', cleaned, { shouldDirty: true, shouldValidate: true });

    const num = parseDecimal(cleaned);
    if (!usdPerEur || num === null) {
      setValue('usdAmount', '', { shouldDirty: true, shouldValidate: true });
      return;
    }
    const usd = convertFromEuro(num, Currencies.USD, currencyRates);
    setValue('usdAmount', toFixedString(usd), { shouldDirty: true, shouldValidate: true });
  };

  const handleUsdBlur = () => {
    const val = normalizeDecimalInput(getValues('usdAmount') || '');
    const num = parseDecimal(val);
    if (num !== null) setValue('usdAmount', toFixedString(num), { shouldDirty: true, shouldValidate: true });
  };
  const handleEurBlur = () => {
    const val = normalizeDecimalInput(getValues('eurAmount') || '');
    const num = parseDecimal(val);
    if (num !== null) setValue('eurAmount', toFixedString(num), { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = useCallback(
    async (data: ExpenseFormData) => {
      setLoading(true);
      try {
        const usdParsed = parseDecimal(data.usdAmount);

        if (usdParsed === null) {
          showNotification('Invalid USD amount', 'error');
          setLoading(false);
          return;
        }

        const usd = usdParsed;
        const formattedDate = formatDate(data.date);

        if (!formattedDate) {
          showNotification('Invalid date provided', 'error');
          setLoading(false);
          return;
        }

        if (id) {
          const updateObj = {
            expenseId: Number(id),
            updates: {
              date: formattedDate,
              description: data.description,
              category: data.category,
              amount: usd,
              type: data.type,
              isPaidByKari: data.isPaidByKari,
              is_default: data.is_default,
            },
          };
          await updateExpense(updateObj);
        } else {
          await insertExpense({
            date: formattedDate,
            description: data.description,
            category: data.category,
            amount: usd,
            type: data.type,
            isPaidByKari: data.isPaidByKari,
            is_default: data.is_default,
          });
        }
        reset();
        await onSaved?.();
        if (!embedded) {
          navigate(ROUTES.EXPENSES);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Error saving expense', error);
        showNotification(`Error saving expense: ${error}`, 'error');
      } finally {
        setLoading(false);
      }
    },
    [embedded, id, insertExpense, updateExpense, navigate, onSaved, reset, showNotification],
  );

  const handleCancel = () => {
    reset();
    if (!embedded) {
      navigate(ROUTES.EXPENSES);
    }
  };

  useEffect(() => {
    if (expense) {
      const usd = expense.amount ?? 0;
      const eur = usdPerEur ? convertToEuro(usd, Currencies.USD, currencyRates) : null;
      reset({
        date: formatDate(expense.date) || '',
        description: expense.description,
        usdAmount: toFixedString(usd),
        eurAmount: eur === null ? '' : toFixedString(eur),
        category: expense.category,
        type: expense.type,
        isPaidByKari: expense.isPaidByKari,
        is_default: expense.is_default,
      });
    }
  }, [expense, usdPerEur, currencyRates, reset]);

  useEffect(() => {
    if (!selectedCategory) return;

    const key = normalizeCategoryKey(selectedCategory);
    const mappedType = CategoryTypeMap[key as keyof typeof CategoryTypeMap];

    if (!mappedType) return;

    // Evita loops y updates innecesarios
    if (getValues('type') !== mappedType) {
      setValue('type', mappedType, { shouldDirty: true, shouldValidate: true });
    }
  }, [selectedCategory, getValues, setValue]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container
        maxWidth={embedded ? false : 'md'}
        sx={{
          mt: embedded ? 0 : 2,
          mb: embedded ? 0 : 5,
          backgroundColor: theme.palette.background.paper,
          p: { xs: 2, sm: 3 },
          borderRadius: '26px',
          boxShadow: '0 14px 34px rgba(0,0,0,.3)',
          maxWidth: embedded ? 'none' : undefined,
        }}
      >
        {showLoader ? (
          <FullLoader />
        ) : (
          <>
            <Typography variant='h5' fontWeight='bold' gutterBottom color='text.primary'>
              {id ? 'Edit expense' : embedded ? 'Add expense' : 'Add expense'}
            </Typography>

            <Box component='form' onSubmit={handleSubmit(onSubmit)} width='100%'>
              <Controller
                name='date'
                control={control}
                render={({ field }) => (
                  <DatePicker
                    {...field}
                    label='Date'
                    value={parseForDateInput(field.value)}
                    onChange={(newDate) => setValue('date', formatDate(newDate))}
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

              <TextField
                label='Description'
                variant='outlined'
                fullWidth
                margin='normal'
                {...register('description')}
                error={!!errors.description}
                helperText={errors.description?.message}
                sx={{
                  input: { color: theme.palette.text.primary },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: theme.palette.divider },
                    '&:hover fieldset': { borderColor: theme.palette.primary.main },
                    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                  },
                }}
              />

              <Box
                display='flex'
                flexDirection={{ xs: 'column', sm: 'row' }}
                alignItems='flex-start'
                gap={2}
                sx={{ width: '100%', mt: 2 }}
              >
                <TextField
                  label='Amount (USD)'
                  type='text'
                  inputMode='decimal'
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  {...register('usdAmount')}
                  onChange={(e) => handleUsdChange(e.target.value)}
                  onBlur={handleUsdBlur}
                  error={!!errors.usdAmount}
                  helperText={errors.usdAmount?.message}
                  sx={{
                    input: { color: theme.palette.text.primary },
                    '& .MuiOutlinedInput-root': {
                      height: 56,
                      '& fieldset': { borderColor: theme.palette.divider },
                      '&:hover fieldset': { borderColor: theme.palette.primary.main },
                      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                    },
                  }}
                />

                <TextField
                  label={`Amount (EUR)${usdPerEur ? '' : ' — waiting rate'}`}
                  type='text'
                  inputMode='decimal'
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  {...register('eurAmount')}
                  onChange={(e) => handleEurChange(e.target.value)}
                  onBlur={handleEurBlur}
                  disabled={!usdPerEur}
                  error={!!errors.eurAmount}
                  helperText={errors.eurAmount?.message}
                  sx={{
                    input: { color: theme.palette.text.primary },
                    '& .MuiOutlinedInput-root': {
                      height: 56,
                      '& fieldset': { borderColor: theme.palette.divider },
                      '&:hover fieldset': { borderColor: theme.palette.primary.main },
                      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                    },
                  }}
                />
              </Box>

              <FormControl fullWidth margin='normal' error={!!errors.category}>
                <Typography variant='caption' color='text.secondary' fontWeight={700} mb={1}>
                  Category
                </Typography>
                <Controller
                  name='category'
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      value={field.value}
                      exclusive
                      onChange={(_, value) => value && field.onChange(value)}
                      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, '& .MuiToggleButtonGroup-grouped': { m: 0, border: '1px solid #2e323b !important', borderRadius: '999px !important' } }}
                    >
                      {Object.values(ExpenseCategory).map((cat) => (
                        <ToggleButton
                          key={cat}
                          value={cat}
                          sx={{ minHeight: 44, px: 2, py: 0, color: 'text.secondary', textTransform: 'capitalize', fontWeight: 700, '&.Mui-selected': { color: 'primary.contrastText', background: 'linear-gradient(140deg,#a6a9ff,#7478ff)' }, '&.Mui-selected:hover': { bgcolor: 'primary.light' } }}
                        >
                          {cat}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  )}
                />
                <FormHelperText>{errors.category?.message}</FormHelperText>
              </FormControl>

              <FormControl fullWidth margin='normal' error={!!errors.type}>
                <Typography variant='caption' color='text.secondary' fontWeight={700} mb={1}>
                  Split
                </Typography>
                <Controller
                  name='type'
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      {...field}
                      exclusive
                      onChange={(_, value) => value && field.onChange(value)}
                      fullWidth
                      sx={{ p: 0.5, bgcolor: '#171920', borderRadius: 999, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '999px !important' } }}
                    >
                      {Object.values(ExpenseType).map((t) => (
                        <ToggleButton key={t} value={t} sx={{ minHeight: 42, color: 'text.secondary', fontWeight: 700, textTransform: 'none', '&.Mui-selected': { bgcolor: '#31353f', color: 'text.primary' }, '&.Mui-selected:hover': { bgcolor: '#393e49' } }}>
                          {t === ExpenseType.SHARED
                            ? '50 / 50'
                            : t === ExpenseType.PERCENTAGE
                              ? 'Percentage'
                              : t === ExpenseType.KARI
                                ? 'Kari only'
                                : 'Adolfo only'}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  )}
                />
                <FormHelperText>{errors.type?.message}</FormHelperText>
              </FormControl>

              <Box display='grid' gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2} mt={1}>
                <Box>
                  <Typography variant='caption' color='text.secondary' fontWeight={700}>
                    Paid by
                  </Typography>
                  <ToggleButtonGroup
                    value={watch('isPaidByKari') ? 'kari' : 'adolfo'}
                    exclusive
                    fullWidth
                    onChange={(_, value) => value && setValue('isPaidByKari', value === 'kari')}
                    sx={{ mt: 1, p: 0.5, bgcolor: '#171920', borderRadius: 999, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '999px !important' } }}
                  >
                    <ToggleButton value='adolfo' sx={{ minHeight: 42, color: 'text.secondary', fontWeight: 700, textTransform: 'none', '&.Mui-selected': { bgcolor: 'info.main', color: '#0d1b2c' } }}>Adolfo</ToggleButton>
                    <ToggleButton value='kari' sx={{ minHeight: 42, color: 'text.secondary', fontWeight: 700, textTransform: 'none', '&.Mui-selected': { bgcolor: 'success.main', color: '#08240f' } }}>Kari</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box>
                  <Typography variant='caption' color='text.secondary' fontWeight={700}>
                    Recurrent
                  </Typography>
                  <FormControlLabel
                    sx={{ display: 'flex', minHeight: 52, mt: 1, mx: 0, px: 1.25, bgcolor: '#171920', border: '1px solid #2e323b', borderRadius: 999 }}
                    control={
                      <Switch
                        {...register('is_default')}
                        checked={watch('is_default')}
                        onChange={(e) => setValue('is_default', e.target.checked)}
                      />
                    }
                    label='Repeats monthly'
                  />
                </Box>
              </Box>

              <Box mt={3} display='flex' flexWrap='wrap' gap={1.25}>
                <Button
                  variant='contained'
                  onClick={handleSubmit(onSubmit)}
                  disabled={loading}
                  startIcon={loading ? undefined : <CheckIcon />}
                >
                  {loading ? <CircularProgress size={24} color='inherit' /> : id ? 'Save changes' : 'Add expense'}
                </Button>
                <Button
                  variant='outlined'
                  color='inherit'
                  onClick={handleCancel}
                  startIcon={<CloseIcon />}
                  sx={{ borderColor: '#333846', color: 'text.secondary' }}
                >
                  {embedded ? 'Clear' : 'Cancel'}
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default Expense;
