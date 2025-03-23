import { useEffect } from 'react';
import { useAuth } from '../../context/Auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Container, 
  TextField, 
  Button, 
  Typography, 
  CircularProgress, 
  Box, 
  useTheme
} from '@mui/material';

const formSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type FormData = z.infer<typeof formSchema>;

const Auth = () => {
  const theme = useTheme();
  const { login, user, error, loading } = useAuth();
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const onSubmit = async (data: FormData) => {
    await login(data.email, data.password);
  };

  return (
    <Container 
      maxWidth='xs' 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        mt: 5,
        backgroundColor: theme.palette.background.paper,
        padding: 3,
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Typography variant='h5' fontWeight='bold' gutterBottom color="text.primary">
        Login
      </Typography>
      {error && (
        <Typography color='error' sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Box component='form' onSubmit={handleSubmit(onSubmit)} width='100%'>
        <TextField
          label='Email'
          variant='outlined'
          fullWidth
          margin='normal'
          type='email'
          {...register('email')}
          error={!!errors.email}
          helperText={errors.email?.message}
          InputLabelProps={{ style: { color: theme.palette.text.primary } }}
          sx={{
            input: { color: theme.palette.text.primary },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: theme.palette.divider },
              '&:hover fieldset': { borderColor: theme.palette.primary.main },
              '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
            },
          }}
        />
        <TextField
          label='Password'
          variant='outlined'
          fullWidth
          margin='normal'
          type='password'
          {...register('password')}
          error={!!errors.password}
          helperText={errors.password?.message}
          InputLabelProps={{ style: { color: theme.palette.text.primary } }}
          sx={{
            input: { color: theme.palette.text.primary },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: theme.palette.divider },
              '&:hover fieldset': { borderColor: theme.palette.primary.main },
              '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
            },
          }}
        />
        <Box mt={2}>
          <Button 
            type='submit'
            variant='contained' 
            color='primary' 
            fullWidth 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color='inherit' /> : 'Login'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Auth;
