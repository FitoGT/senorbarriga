import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Container,
  TextField,
  Typography,
  CircularProgress,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  IconButton,
  FormHelperText,
  useTheme,
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
});

type ExpenseFormData = z.infer<typeof formSchema>;

const Expense = () => {
  const { mutate: insertExpense } = useInsertEpenseMutation();
  const { mutate: updateExpense } = useUpdateExpenseMutation();
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
    },
  });

  const currencyRates = useMemo(() => buildRatesMap(exchangeData), [exchangeData]);
  const usdPerEur = currencyRates[Currencies.USD];

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
      });
    }
  }, [expense, usdPerEur, currencyRates, reset]);

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
            },
          };
          updateExpense(updateObj);
        } else {
          insertExpense({
            date: formattedDate,
            description: data.description,
            category: data.category,
            amount: usd,
            type: data.type,
            isPaidByKari: data.isPaidByKari,
            // eslint-disable-next-line camelcase
            is_default: false,
          });
        }
        reset();
        navigate(ROUTES.EXPENSES);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Error saving expense', error);
        showNotification(`Error saving expense: ${error}`, 'error');
      } finally {
        setLoading(false);
      }
    },
    [id, insertExpense, updateExpense, navigate, reset, showNotification],
  );

  const handleCancel = () => {
    reset();
    navigate(ROUTES.EXPENSES);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container
        maxWidth='xs'
        sx={{
          mt: 10,
          mb: 10,
          backgroundColor: theme.palette.background.paper,
          p: 3,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        {showLoader ? (
          <FullLoader />
        ) : (
          <>
            <Typography variant='h5' fontWeight='bold' gutterBottom color='text.primary'>
              {id ? 'Edit Expense' : 'Add Expense'}
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

              <Box display='flex' alignItems='flex-start' gap={2} sx={{ width: '100%', mt: 2 }}>
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
                <InputLabel>Category</InputLabel>
                <Controller
                  name='category'
                  control={control}
                  render={({ field }) => (
                    <Select {...field}>
                      {Object.values(ExpenseCategory).map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                <FormHelperText>{errors.category?.message}</FormHelperText>
              </FormControl>

              <FormControl fullWidth margin='normal' error={!!errors.type}>
                <InputLabel>Type</InputLabel>
                <Controller
                  name='type'
                  control={control}
                  render={({ field }) => (
                    <Select {...field}>
                      {Object.values(ExpenseType).map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
                <FormHelperText>{errors.type?.message}</FormHelperText>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    {...register('isPaidByKari')}
                    checked={watch('isPaidByKari')}
                    onChange={(e) => setValue('isPaidByKari', e.target.checked)}
                  />
                }
                label='Paid by Kari'
              />

              <Box mt={3} display='flex' gap={2}>
                <IconButton
                  color='success'
                  onClick={handleSubmit(onSubmit)}
                  disabled={loading}
                  sx={{ flexGrow: 1, border: '1px solid', borderRadius: '8px', p: 1 }}
                >
                  {loading ? <CircularProgress size={24} color='inherit' /> : <CheckIcon />}
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
          </>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default Expense;
