import { useState } from 'react';
import { CurrentAccountChoice } from './CurrentAccount';
import type { Account, StatementTransaction } from '../types/backend';
import { Container } from '@mui/material';
import TransactionList from './TransactionList';
import { StatementUpload } from './Statement';
import { Header } from './Header';
import { MenuDrawer } from './Menu';
import { useSessionState } from '../hooks/sessionState';

export const Main = () => {
  const [currentAccount, setCurrentAccount] = useSessionState<Account | null>(
    'currentAccount',
    null,
  );
  const [statement, setStatement] = useSessionState<StatementTransaction[] | null>(
    'statement',
    null,
  );
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Header
        currentAccount={currentAccount ?? undefined}
        statement={statement ?? undefined}
        onClick={() => currentAccount && setMenuOpen(true)}
      />
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <MenuDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          currentAccount={currentAccount}
          setCurrentAccount={setCurrentAccount}
          statement={statement}
          setStatement={setStatement}
        />
        {!currentAccount && <CurrentAccountChoice setCurrentAccount={setCurrentAccount} />}
        {currentAccount && statement === null && (
          <StatementUpload
            statement={statement}
            accountId={currentAccount.id!}
            setStatement={setStatement}
            replace={true}
          />
        )}
        {currentAccount && statement !== null && (
          <TransactionList currentAccount={currentAccount} statement={statement} />
        )}
      </Container>
    </>
  );
};
