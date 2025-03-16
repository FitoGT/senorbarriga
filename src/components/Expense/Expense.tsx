import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Container, 
  TextField, 
  Button, 
  Typography, 
  CircularProgress, 
  Box, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select, 
  Switch, 
  FormControlLabel 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import { ExpenseCategory, ExpenseType } from '../../interfaces/Expenses';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { useState } from 'react';

const formSchema = z.object({
  date: z.string().min(1, 'Date is required'), // Cambiado a string en vez de z.date()
  description: z.string().min(3, 'Description must be at least 3 characters'),
  amount: z.string().min(1, 'Amount is required'),
  category: z.nativeEnum(ExpenseCategory),
  type: z.nativeEnum(ExpenseType),
  isPaidByKari: z.boolean(),
});

type ExpenseFormData = z.infer<typeof formSchema>;

const Expense = () => {
  const [loading, setLoading] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    setValue,
    watch,
    control,
    formState: { errors } 
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: dayjs().format('YYYY-MM-DD'), // Valor inicial en string
      isPaidByKari: false,
    }
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setLoading(true);
    try {
      await supabaseService.insertExpense({
        date: data.date, // Ya es string con formato 'YYYY-MM-DD'
        description: data.description,
        category: data.category,
        amount: parseFloat(data.amount),
        type: data.type,
        isPaidByKari: data.isPaidByKari,
      });

      alert('Expense added successfully!');
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xs" sx={{ mt: 5 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Add Expense
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} width="100%">
          
          {/* Date Picker */}
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                label="Date"
                value={field.value ? dayjs(field.value) : null} // Convierte el string en Dayjs
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

          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              {...register('category')}
              onChange={(e) => setValue('category', e.target.value as ExpenseCategory)}
            >
              {Object.values(ExpenseCategory).map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              {...register('type')}
              onChange={(e) => setValue('type', e.target.value as ExpenseType)}
            >
              {Object.values(ExpenseType).map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
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

          <Box mt={2}>
            <Button 
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Add Expense'}
            </Button>
          </Box>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default Expense;
