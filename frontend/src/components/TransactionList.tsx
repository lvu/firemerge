import { Alert, Box, Stack } from '@mui/material';
import type { Account, StatementTransaction, Transaction } from '../types/backend';
import { TransactionCard } from './TransactionCard';
import { useState } from 'react';
import { useTransactions } from '../hooks/backend';
import { TransactionDialog } from './TransactionDialog';

export default function TransactionList({
  currentAccount,
  statement,
  showMatched,
}: {
  currentAccount: Account | null;
  statement: StatementTransaction[] | null;
  showMatched: boolean;
}) {
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
