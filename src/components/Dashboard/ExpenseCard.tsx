import { Card, CardContent, Typography, Stack, useTheme } from '@mui/material';

interface ExpenseCardProps {
  title: string;
  amount: string;
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning';
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({ title, amount, color = 'primary' }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        backgroundColor: theme.palette.grey[900],
        color: theme.palette.text.primary,
        flex: 1,
        minWidth: 250,
        p: 1,
      }}
      elevation={3}
    >
      <CardContent>
        <Stack direction='row' alignItems='center' justifyContent='space-between'>
          <Typography variant='h6' fontWeight='bold'>
            {title}
          </Typography>
        </Stack>
        <Typography variant='h6' color={theme.palette[color].main}>
          € {amount}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ExpenseCard;
