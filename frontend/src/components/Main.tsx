import { CurrentAccount } from './CurrentAccount';
import { useState } from 'react';
import type { Account } from '../types/backend';
import StatementFileUpload from './FileUpload';
import { Transactions } from './Transactions';
import { Divider, Container, Typography, Stack } from '@mui/material';

export const Main = () => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  return (
    <Container maxWidth="md">
      <Stack
        spacing={2}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        <Typography variant="h4" component="h1">
          Firemerge
        </Typography>
        <CurrentAccount currentAccount={currentAccount} setCurrentAccount={setCurrentAccount} />
        <StatementFileUpload />
        <Divider />
        <Transactions currentAccount={currentAccount} />
      </Stack>
    </Container>
  );
};
