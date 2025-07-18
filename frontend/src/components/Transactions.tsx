import { useQuery } from '@tanstack/react-query';
import { getTransactions } from '../services/backend';
import { Alert, Box, FormControlLabel, Stack, Switch } from '@mui/material';
import type { Account } from '../types/backend';
import { TransactionCard } from './TransactionCard';
import { useState } from 'react';

export const Transactions = ({ currentAccount }: { currentAccount: Account | null }) => {
  const [showMatched, setShowMatched] = useState(true);
  const { data: transactions, error } = useQuery({
    queryKey: ['global', 'transactions', currentAccount?.id],
    queryFn: () => {
      if (!currentAccount) {
        return null;
      }
      return getTransactions(currentAccount.id);
    },
    staleTime: Infinity,
  });

  if (error) {
    return <Alert severity="error">Error: {error.message}</Alert>;
  }
  if (!transactions) {
    return <Alert severity="info">No transactions found</Alert>;
  }

  return (
    <Box>
      <FormControlLabel
        control={<Switch checked={showMatched} onChange={() => setShowMatched(!showMatched)} />}
        label="Show matched"
      />
      <Stack
        spacing={2}
        sx={{
          bgcolor: 'background.paper',
          flexGrow: 1,
          overflow: 'auto',
        }}
      >
        {transactions.map((tr) => (
          <TransactionCard
            key={tr.id}
            initialTransaction={tr}
            currentAccount={currentAccount!}
            visible={showMatched ? true : tr.state !== 'matched'}
          />
        ))}
      </Stack>
    </Box>
  );
};
