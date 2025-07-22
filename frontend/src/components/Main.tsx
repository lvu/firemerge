import { CurrentAccount } from './CurrentAccount';
import { useState } from 'react';
import type { Account } from '../types/backend';
import StatementFileUpload from './FileUpload';
import { Transactions } from './Transactions';
import { Container, Typography, AppBar, Toolbar, Alert, Stack } from '@mui/material';
import { useUploadTransactions } from '../hooks/backend';
import { RefreshButton } from './RefreshButton';

export const Main = () => {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const {
    mutate: uploadTransactions,
    isPending: isUploading,
    error: uploadError,
  } = useUploadTransactions();

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
          <Stack direction="row" spacing={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <CurrentAccount currentAccount={currentAccount} setCurrentAccount={setCurrentAccount} />
            <StatementFileUpload
              uploadTransactions={uploadTransactions}
              isUploading={isUploading}
            />
          </Stack>
          {uploadError && <Alert severity="error">{uploadError.message}</Alert>}
          <Transactions currentAccount={currentAccount} />
        </Stack>
      </Container>
    </>
  );
};
