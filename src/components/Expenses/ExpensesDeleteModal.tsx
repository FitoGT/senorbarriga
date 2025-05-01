import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction='up' ref={ref} {...props} />;
});

interface ExpensesDeleteModalProps {
  open: boolean;
  expenseId: number;
  handleClose: (event: NonNullable<unknown>, reason: 'backdropClick' | 'escapeKeyDown') => void;
  handleDelete: (expenseId: number) => void;
}

const ExpensesDeleteModal = (props: ExpensesDeleteModalProps) => {
  const { open, handleClose, handleDelete, expenseId } = props;
  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      aria-describedby='alert-dialog-slide-description'
    >
      <DialogTitle>Are you sure you want to delete the Expense?</DialogTitle>
      <DialogContent>
        <DialogContentText id='alert-dialog-slide-description'>
          This is an irreversible action if you click AGREE data will be lost
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={(event) => handleClose(event, 'backdropClick')}>Disagree</Button>
        <Button onClick={() => handleDelete(expenseId)}>Agree</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpensesDeleteModal;
