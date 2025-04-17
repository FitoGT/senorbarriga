import { Card, CardContent, Typography, Stack, IconButton, TextField, useTheme } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface DisplayCardProps {
  title: string;
  amount: string;
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning';
  percentage?: string; // optional
  editing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tempValue?: string | null;
}

const DisplayCard: React.FC<DisplayCardProps> = ({
  title,
  amount,
  color = 'primary',
  percentage,
  editing = false,
  onEdit,
  onSave,
  onCancel,
  onChange,
  tempValue,
}) => {
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
          {/* Show edit icon if editable */}
          {onEdit && !editing && (
            <IconButton onClick={onEdit} sx={{ color: theme.palette.text.primary }}>
              <EditIcon />
            </IconButton>
          )}
          {editing && (
            <>
              {onSave && (
                <IconButton color='success' onClick={onSave}>
                  <CheckIcon />
                </IconButton>
              )}
              {onCancel && (
                <IconButton color='error' onClick={onCancel}>
                  <CloseIcon />
                </IconButton>
              )}
            </>
          )}
        </Stack>

        {/* Amount or Editable Input */}
        {editing && onChange ? (
          <TextField
            fullWidth
            value={tempValue || ''}
            onChange={onChange}
            variant='outlined'
            size='small'
            sx={{
              input: { color: theme.palette.text.primary },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
              },
            }}
          />
        ) : (
          <Typography variant='h6' color={theme.palette[color].main}>
            $ {amount}
          </Typography>
        )}

        {/* Show percentage if available */}
        {percentage && (
          <Typography variant='body2' color='text.secondary'>
            {percentage}% of total
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default DisplayCard;
