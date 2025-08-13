import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { Account } from '../types/backend';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useState } from 'react';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export const StatementExportDialog = ({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: Account;
}) => {
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(3, 'month'));
  return (
    <Dialog open={open} onClose={onClose} aria-hidden={!open}>
      <DialogTitle>Export statement</DialogTitle>
      <DialogContent>
        <DatePicker value={startDate} onChange={(value) => setStartDate(value as Dayjs)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            onClose();
            window.open(
              `/api/accounts/${account.id}/taxer-statement?start_date=${startDate.format('YYYY-MM-DD')}`,
              '_blank',
            );
          }}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
};
