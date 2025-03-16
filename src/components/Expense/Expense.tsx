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
  FormHelperText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import { ExpenseCategory, ExpenseType } from '../../interfaces/Expenses';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const formSchema = z.object({
  date: z.string()
    .min(1, 'Date is required')
    .refine((value) => dayjs(value, 'YYYY-MM-DD', true).isValid(), {
      message: 'Invalid date format (YYYY-MM-DD required)',
    }),
  
  description: z.string()
    .min(3, 'Description must be at least 3 characters')
    .max(100, 'Description must be at most 100 characters'),

  amount: z.string()
    .min(1, 'Amount is required')
    .refine((value) => !isNaN(parseFloat(value)) && parseFloat(value) > 0, {
      message: 'Amount must be a valid number greater than 0',
    }),

  category: z.nativeEnum(ExpenseCategory, {
    errorMap: () => ({ message: 'Category is required' }),
  }),

  type: z.nativeEnum(ExpenseType, {
    errorMap: () => ({ message: 'Type is required' }),
  }),

  isPaidByKari: z.boolean(),
});

type ExpenseFormData = z.infer<typeof formSchema>;

const Expense = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    setValue,
    watch,
    control,
    reset,
    formState: { errors } 
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: dayjs().format('YYYY-MM-DD'),
      isPaidByKari: false,
    }
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      await supabaseService.insertExpense({
        date: data.date,
        description: data.description,
        category: data.category,
        amount: parseFloat(data.amount),
        type: data.type,
        isPaidByKari: data.isPaidByKari,
      });
      reset(); 
      navigate('/dashboard');
    } catch (error) {
      alert('Error adding expense');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset(); 
    navigate('/dashboard');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xs" sx={{ mt: 5 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Add Expense
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} width="100%">
          
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                label="Date"
                value={field.value ? dayjs(field.value) : null}
                onChange={(newDate) => setValue('date', newDate ? newDate.format('YYYY-MM-DD') : '')}
                format="YYYY-MM-DD"
                slotProps={{
                  textField: {
                    variant: 'outlined',
                    fullWidth: true,
                    margin: 'normal',
                    error: !!errors.date,
                    helperText: errors.date?.message,
                  }
                }}
              />
            )}
          />

          <TextField
            label="Description"
            variant="outlined"
            fullWidth
            margin="normal"
            {...register('description')}
            error={!!errors.description}
            helperText={errors.description?.message}
          />

          <TextField
            label="Amount"
            variant="outlined"
            fullWidth
            margin="normal"
            type="number"
            {...register('amount')}
            error={!!errors.amount}
            helperText={errors.amount?.message}
          />

          {/* Category Select con validación */}
          <FormControl fullWidth margin="normal" error={!!errors.category}>
            <InputLabel>Category</InputLabel>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select {...field} onChange={(e) => setValue('category', e.target.value as ExpenseCategory)}>
                  {Object.values(ExpenseCategory).map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              )}
            />
            <FormHelperText>{errors.category?.message}</FormHelperText>
          </FormControl>

          {/* Type Select con validación */}
          <FormControl fullWidth margin="normal" error={!!errors.type}>
            <InputLabel>Type</InputLabel>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select {...field} onChange={(e) => setValue('type', e.target.value as ExpenseType)}>
                  {Object.values(ExpenseType).map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
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
            label="Paid by Kari"
          />

          {/* Botones de Confirmar y Cancelar al final del formulario */}
          <Box mt={3} display="flex" gap={2}>
            <IconButton 
              color="success" 
              onClick={handleSubmit(onSubmit)} 
              disabled={loading} 
              sx={{ flexGrow: 1, border: '1px solid', borderRadius: '8px', p: 1 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : <CheckIcon />}
            </IconButton>
            <IconButton 
              color="error" 
              onClick={handleCancel} 
              sx={{ flexGrow: 1, border: '1px solid', borderRadius: '8px', p: 1 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default Expense;
