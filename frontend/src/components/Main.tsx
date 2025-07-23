import { CurrentAccount } from './CurrentAccount';
import { useState } from 'react';
import type { Account, StatementTransaction } from '../types/backend';
import StatementFileUpload from './Statement';
import { Transactions } from './Transactions';
import { Container, Typography, AppBar, Toolbar, Stack } from '@mui/material';
import { RefreshButton } from './RefreshButton';

export const Main = () => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [statement, setStatement] = useState<StatementTransaction[] | null>(null);

  return (
    <>
      <AppBar position="sticky">
        <Toolbar sx={{ justifyContent: 'space-between', py: 2 }}>
          <Typography variant="h6" component="h1">
            Firemerge
          </Typography>
          <RefreshButton />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Stack direction="column" spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <CurrentAccount currentAccount={currentAccount} setCurrentAccount={setCurrentAccount} />
            <StatementFileUpload statement={statement} setStatement={setStatement} />
          </Stack>
          <Transactions currentAccount={currentAccount} statement={statement} />
        </Stack>
      </Container>
    </>
  );
};
