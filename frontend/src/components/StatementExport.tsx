import { Box, Button, IconButton, Popover } from '@mui/material';
import type { Account } from '../types/backend';
import { Download } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useState } from 'react';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export const StatementExport = ({ account }: { account: Account }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(3, 'month'));
  return (
    <>
      <IconButton onClick={() => setPopoverOpen(true)}>
        <Download />
      </IconButton>
      <Popover open={popoverOpen} onClose={() => setPopoverOpen(false)}>
        <Box display="flex" flexDirection="row" alignItems="center" gap={1}>
          <DatePicker value={startDate} onChange={(value) => setStartDate(value as Dayjs)} />
          <Button
            component="a"
            href={`/api/accounts/${account.id}/taxer-statement?start_date=${startDate.format('YYYY-MM-DD')}`}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download />
          </Button>
        </Box>
      </Popover>
    </>
  );
};
