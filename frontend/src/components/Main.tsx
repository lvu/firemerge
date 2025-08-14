import { useState } from 'react';
import { CurrentAccountChoice } from './CurrentAccount';
import { Container } from '@mui/material';
import TransactionList from './TransactionList';
import { StatementUpload } from './Statement';
import { Header } from './Header';
import { MenuDrawer } from './Menu';
import { useCurrentAccount, useStatement } from '../hooks/sessionState';

export const Main = () => {
  const [statement, setStatement] = useStatement();
  const [currentAccount, setCurrentAccount] = useCurrentAccount(setStatement);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMatched, setShowMatched] = useState(true);

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
          showMatched={showMatched}
          setShowMatched={setShowMatched}
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
          <TransactionList
            currentAccount={currentAccount}
            statement={statement}
            showMatched={showMatched}
          />
        )}
      </Container>
    </>
  );
};
