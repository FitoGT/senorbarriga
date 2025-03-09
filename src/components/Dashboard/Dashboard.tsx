import { useEffect, useState } from 'react';
import { supabaseService } from '../../services/Supabase/SupabaseService';
import { Income } from '../../interfaces/Income';
import { 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress, 
  Stack, 
  IconButton, 
  TextField 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const Dashboard = () => {
  const [incomeData, setIncomeData] = useState<Income | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<'kari' | 'adolfo' | null>(null);
  const [tempValue, setTempValue] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncome = async () => {
      setLoading(true);
      try {
        const latestIncome = await supabaseService.getLatestIncome();
        setIncomeData(latestIncome);
      } catch (error) {
        console.error('Error fetching income:', error);
      }
      setLoading(false);
    };

    fetchIncome();
  }, []);

  const handleEditClick = (person: 'kari' | 'adolfo') => {
    setEditing(person);
    const value = person === 'kari' ? incomeData?.kari_income ?? 0 : incomeData?.adolfo_income ?? 0;
    setTempValue(formatNumber(value));
  };

  const handleCancel = () => {
    setEditing(null);
    setTempValue(null);
  };

  const handleSave = async () => {
    if (!editing || tempValue === null) return;

    const newValue = parseFloat(tempValue.replace(',', '.'));

    try {
      await supabaseService.updateIncome(editing, newValue);
      const latestIncome = await supabaseService.getLatestIncome();
      setIncomeData(latestIncome);
    } catch (error) {
      console.error('Error updating income:', error);
    }

    setEditing(null);
    setTempValue(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    value = value.replace(/[^0-9,]/g, '');

    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) {
      return;
    }

    setTempValue(value);
  };

  return (
    <Container maxWidth='md' sx={{ mt: 4 }}>
      {loading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }} justifyContent="center">

          <Card sx={{ backgroundColor: '#e8f5e9', flex: 1, minWidth: 300, p: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" fontWeight="bold">Kari&apos;s Income</Typography>
                {editing === 'kari' ? (
                  <>
                    <IconButton color="success" onClick={handleSave}><CheckIcon /></IconButton>
                    <IconButton color="error" onClick={handleCancel}><CloseIcon /></IconButton>
                  </>
                ) : (
                  <IconButton onClick={() => handleEditClick('kari')}><EditIcon /></IconButton>
                )}
              </Stack>
              {editing === 'kari' ? (
                <TextField
                  fullWidth
                  value={tempValue || ''}
                  onChange={handleInputChange}
                  variant="outlined"
                  size="small"
                />
              ) : (
                <Typography variant='h3' color='primary'>€ {incomeData ? formatNumber(incomeData.kari_income) : '0,00'}</Typography>
              )}
              <Typography variant='h6' color='textSecondary'>{incomeData ? formatNumber(incomeData.kari_percentage) : '0,00'}% of total</Typography>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: '#e3f2fd', flex: 1, minWidth: 300, p: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant='h6' fontWeight='bold'>Adolfo&apos;s Income</Typography>
                {editing === 'adolfo' ? (
                  <>
                    <IconButton color="success" onClick={handleSave}><CheckIcon /></IconButton>
                    <IconButton color="error" onClick={handleCancel}><CloseIcon /></IconButton>
                  </>
                ) : (
                  <IconButton onClick={() => handleEditClick('adolfo')}><EditIcon /></IconButton>
                )}
              </Stack>
              {editing === 'adolfo' ? (
                <TextField
                  fullWidth
                  value={tempValue || ''}
                  onChange={handleInputChange}
                  variant="outlined"
                  size="small"
                />
              ) : (
                <Typography variant='h3' color='primary'>€ {incomeData ? formatNumber(incomeData.adolfo_income) : '0,00'}</Typography>
              )}
              <Typography variant='h6' color='textSecondary'>{incomeData ? formatNumber(incomeData.adolfo_percentage) : '0,00'}% of total</Typography>
            </CardContent>
          </Card>

          <Card sx={{ backgroundColor: '#f5f5f5', flex: 1, minWidth: 300, p: 2 }}>
            <CardContent>
              <Typography variant='h6' fontWeight='bold'>Total Income</Typography>
              <Typography variant='h3' color='primary'>€ {incomeData ? formatNumber(incomeData.total_income) : '0,00'}</Typography>
              <Typography variant='h6' color='textSecondary'>100,00% of total</Typography>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Container>
  );
};

export default Dashboard;
