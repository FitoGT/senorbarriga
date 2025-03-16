import { Card, CardContent, Typography, Stack, IconButton, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

interface IncomeCardProps {
  title: string;
  amount: string;
  percentage: string;
  backgroundColor: string;
  editing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tempValue?: string | null;
}

const IncomeCard: React.FC<IncomeCardProps> = ({
  title,
  amount,
  percentage,
  backgroundColor,
  editing = false,
  onEdit,
  onSave,
  onCancel,
  onChange,
  tempValue,
}) => {
  return (
    <Card sx={{ backgroundColor, flex: 1, minWidth: 300, p: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight="bold">{title}</Typography>
          {onEdit && !editing && (
            <IconButton onClick={onEdit}>
              <EditIcon />
            </IconButton>
          )}
          {editing && (
            <>
              {onSave && (
                <IconButton color="success" onClick={onSave}>
                  <CheckIcon />
                </IconButton>
              )}
              {onCancel && (
                <IconButton color="error" onClick={onCancel}>
                  <CloseIcon />
                </IconButton>
              )}
            </>
          )}
        </Stack>
        {editing && onChange ? (
          <TextField
            fullWidth
            value={tempValue || ''}
            onChange={onChange}
            variant="outlined"
            size="small"
          />
        ) : (
          <Typography variant='h3' color='primary'>€ {amount}</Typography>
        )}
        <Typography variant='h6' color='textSecondary'>{percentage}% of total</Typography>
      </CardContent>
    </Card>
  );
};

export default IncomeCard;
