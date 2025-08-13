import { useState } from 'react';
import { CurrentAccount } from './CurrentAccount';
import type { Account, StatementTransaction } from '../types/backend';
import { Container, Stack } from '@mui/material';
import Transactions from './Transactions';
import Statement from './Statement';
import { Header } from './Header';

export const Main = () => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [statement, setStatement] = useState<StatementTransaction[] | null>(null);

  return (
    <>
      <Header currentAccount={currentAccount ?? undefined} statement={statement ?? undefined} />
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
