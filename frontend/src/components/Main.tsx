import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { CurrentAccount } from './CurrentAccount';
import { useState } from 'react';
import type { Account } from '../types/backend';
import StatementFileUpload from './FileUpload';
import { Transactions } from './Transactions';

export const Main = () => {
    const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

    return (
      <Container maxWidth="sm">
        <Box sx={{ my: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h4" component="h1">
              Firemerge
            </Typography>
            <CurrentAccount currentAccount={currentAccount} setCurrentAccount={setCurrentAccount} />
            <StatementFileUpload />
            <Transactions currentAccount={currentAccount} />
          </Stack>
        </Box>
      </Container>
    )
}