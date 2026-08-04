import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

interface Props {
  open: boolean;
  label: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const SettlementDeleteDialog = ({ open, label, loading, onClose, onConfirm, title, message }: Props) => (
  <Dialog open={open} onClose={onClose} aria-labelledby='delete-income-dialog-title'>
    <DialogTitle id='delete-income-dialog-title'>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>
        {message} <strong>{label}</strong>.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading} color='inherit'>Cancel</Button>
      <Button onClick={onConfirm} disabled={loading} color='error' autoFocus>
        {loading ? 'Deleting…' : 'Delete'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default SettlementDeleteDialog;
