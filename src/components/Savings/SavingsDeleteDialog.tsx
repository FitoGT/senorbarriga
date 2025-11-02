import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

interface SavingsDeleteDialogProps {
  open: boolean;
  dateLabel: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const SavingsDeleteDialog = ({ open, dateLabel, loading = false, onClose, onConfirm }: SavingsDeleteDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby='delete-savings-dialog-title'>
      <DialogTitle id='delete-savings-dialog-title'>Delete savings snapshot?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will remove all savings records stored for <strong>{dateLabel}</strong>. This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading} color='inherit'>
          Cancel
        </Button>
        <Button onClick={onConfirm} color='error' disabled={loading} autoFocus>
          {loading ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SavingsDeleteDialog;
