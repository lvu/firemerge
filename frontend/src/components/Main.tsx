import { useState } from 'react';
import { CurrentAccount } from './CurrentAccount';
import type { Account, StatementTransaction } from '../types/backend';
import { Container, Typography, AppBar, Toolbar, Stack, Box } from '@mui/material';
import { RefreshButton } from './RefreshButton';
import Transactions from './Transactions';
import Statement from './Statement';
import Logo from '../assets/firemerge.svg?react';

export const Main = () => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [statement, setStatement] = useState<StatementTransaction[] | null>(null);

  return (
    <>
      <AppBar position="sticky">
        <Toolbar sx={{ justifyContent: 'space-between', py: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ borderRadius: '50%', overflow: 'hidden', height: '3rem', width: '3rem' }}>
              <Logo width={'100%'} height={'100%'} fill="blue" />
            </Box>
            <Typography variant="h6" component="h1">
              Firemerge
            </Typography>
          </Stack>
          <RefreshButton />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Stack direction="column" spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <CurrentAccount
              currentAccount={currentAccount}
              setCurrentAccount={(acct) => {
                setCurrentAccount(acct);
                setStatement(null);
              }}
            />
            {currentAccount && (
              <Statement
                statement={statement}
                accountId={currentAccount.id!}
                setStatement={setStatement}
              />
            )}
          </Stack>
          {currentAccount && statement !== null && (
            <Transactions currentAccount={currentAccount} statement={statement} />
          )}
        </Stack>
      </Container>
    </>
  );
};
