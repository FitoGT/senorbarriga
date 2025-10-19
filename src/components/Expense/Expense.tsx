import { useState, useEffect, useCallback } from 'react';
import { data, useNavigate, useParams } from 'react-router-dom';
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
import dayjs from 'dayjs';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import FullLoader from '../Loader/FullLoader';
import { ExpenseCategory, ExpenseType, Currencies } from '../../interfaces/';
import { useNotifications } from '../../context';
import { ROUTES } from '../../constants/routes';
import { useInsertEpenseMutation, useUpdateExpenseMutation, useGetExpenseById } from '../../api/expenses/expenses';
import { useGetCurrentExchangeRate } from '../../api/exchange-rate/exchange-rate';
const formSchema = z.object({
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((value) => dayjs(value, 'YYYY-MM-DD', true).isValid(), {
      message: 'Invalid date format (YYYY-MM-DD required)',
    }),
  description: z
    .string()
    .min(1, 'Description must be at least 1 character')
    .max(100, 'Description must be at most 100 characters'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((value) => !isNaN(parseFloat(value)) && parseFloat(value) > 0, {
      message: 'Amount must be a valid number greater than 0',
    }),
  category: z.nativeEnum(ExpenseCategory, { errorMap: () => ({ message: 'Category is required' }) }),
  type: z.nativeEnum(ExpenseType, { errorMap: () => ({ message: 'Type is required' }) }),
  isPaidByKari: z.boolean(),
  currency: z.nativeEnum(Currencies, { errorMap: () => ({ message: 'Currency is required' }) }),
});

type ExpenseFormData = z.infer<typeof formSchema>;

const Expense = () => {
  const { mutate: insertExpense } = useInsertEpenseMutation();
  const { mutate: updateExpense } = useUpdateExpenseMutation();
  const { data: exchangeData } = useGetCurrentExchangeRate()

  const [loading, setLoading] = useState(false);
  const [prevSelectedCurrency, setPrevSelectedCurrency] = useState('USD');
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
    watch,
    control,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: dayjs().format('YYYY-MM-DD'),
      isPaidByKari: false,
      category: ExpenseCategory.FOOD,
      type: ExpenseType.PERCENTAGE,
      currency: Currencies.USD,
    },
  });

  const currency = watch('currency');

  useEffect(() => {
    const isNotValidAmount = getValues('amount').length === 0 || getValues('amount') === '0';
    if (isNotValidAmount) {
      return
    }
    let newAmount = parseFloat(getValues('amount'));
    if (currency === 'EUR' && exchangeData) {
      newAmount = parseFloat(getValues('amount')) * exchangeData['USD'];
      setValue('amount', String(newAmount), { shouldDirty: true, shouldValidate: true });
      setPrevSelectedCurrency('EUR')
      return
    }
    if (currency === 'USD' && prevSelectedCurrency === 'EUR' && exchangeData) {
      newAmount = parseFloat(getValues('amount')) / exchangeData['USD'];
      setValue('amount', String(newAmount), { shouldDirty: true, shouldValidate: true });
      setPrevSelectedCurrency('USD')
      return
    }
  }, [currency, getValues]);

  useEffect(() => {
    if (expense) {
      reset({
        date: expense.date,
        description: expense.description,
        amount: expense.amount.toString(),
        category: expense.category,
        type: expense.type,
        isPaidByKari: expense.isPaidByKari,
      });
    }
  }, [expense, reset]);

  const onSubmit = useCallback(
    async (data: ExpenseFormData) => {
      setLoading(true);
      try {
        if (id) {
          const updateObj = {
            expenseId: Number(id),
            updates: {
              date: data.date,
              description: data.description,
              category: data.category,
              amount: parseFloat(data.amount),
              type: data.type,
              isPaidByKari: data.isPaidByKari,
            },
          };
          updateExpense(updateObj);
        } else {
          insertExpense({
            date: data.date,
            description: data.description,
            category: data.category,
            amount: parseFloat(data.amount),
            type: data.type,
            isPaidByKari: data.isPaidByKari,
            // eslint-disable-next-line camelcase
            is_default: false,
          });
        }
        reset();
        navigate(ROUTES.EXPENSES);
      } catch (error) {
        console.log('Error saving expense', error);
        showNotification(`Error saving expense: ${error}`, 'error');
      } finally {
        setLoading(false);
      }
    },
    [data, id],
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
          padding: 3,
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
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(newDate) => setValue('date', newDate ? newDate.format('YYYY-MM-DD') : '')}
                    format='YYYY-MM-DD'
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
                alignItems='center'
                gap={2}
                sx={{
                  width: '100%',
                  mt: 2,
                }}
              >
                <TextField
                  label='Amount'
                  variant='outlined'
                  type='number'
                  fullWidth
                  {...register('amount')}
                  error={!!errors.amount}
                  helperText={errors.amount?.message}
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

                <FormControl
                  sx={{
                    width: 90,
                    '& .MuiOutlinedInput-root': {
                      height: 56,
                    },
                  }}
                  error={!!errors.currency}
                >
                  <Controller
                    name='currency'
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        displayEmpty
                        variant='outlined'
                        inputProps={{ sx: { height: 56, display: 'flex', alignItems: 'center' } }}
                      >
                        {Object.values(Currencies).map((cur) => (
                          <MenuItem key={cur} value={cur}>
                            {cur}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                  <FormHelperText>{errors.currency?.message}</FormHelperText>
                </FormControl>
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
