import { Alert, Box, FormControlLabel, Stack, Switch } from '@mui/material';
import type { Account, StatementTransaction, Transaction } from '../types/backend';
import { TransactionCard } from './TransactionCard';
import { useState } from 'react';
import { useTransactions } from '../hooks/backend';
import { TransactionDialog } from './TransactionDialog';

export default function Transactions({
  currentAccount,
  statement,
}: {
  currentAccount: Account | null;
  statement: StatementTransaction[] | null;
}) {
  const [showMatched, setShowMatched] = useState(true);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const { data: transactions, error } = useTransactions(currentAccount?.id, statement ?? undefined);

  if (error) {
    return <Alert severity="error">Error: {error.message}</Alert>;
  }
  if (!transactions) {
    return <Alert severity="info">No transactions found</Alert>;
  }

  const handleTransactionClick = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
  };

  return (
    <Box>
      <TransactionDialog
        initialTransaction={currentTransaction}
        currentAccount={currentAccount!}
        onClose={() => setCurrentTransaction(null)}
      />
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
            onEdit={handleTransactionClick}
          />
        ))}
      </Stack>
    </Box>
  );
}
