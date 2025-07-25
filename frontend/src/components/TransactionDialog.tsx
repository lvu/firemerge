import { TransactionTypeInput } from './TransactionTypeInput';
import { DescriptionInput } from './DescriptionInput';
import { CategoryInput } from './CategoryInput';
import { AccountInput } from './AccountInput';
import { Candidates } from './Candidates';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  Typography,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Account, Transaction } from '../types/backend';
import { useEffect, useState } from 'react';
import { useUpdateTransaction } from '../hooks/backend';
import { Loader } from './Loader';

function TransactionForm({
  transaction,
  setTransaction,
  currentAccount,
}: {
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
  currentAccount: Account;
}) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Stack direction="column" spacing={2}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <TransactionTypeInput transaction={transaction} setTransaction={setTransaction} />
          </Stack>
          <DescriptionInput
            accountId={currentAccount.id}
            transaction={transaction}
            setTransaction={setTransaction}
          />
          <CategoryInput transaction={transaction} setTransaction={setTransaction} />
          <AccountInput transaction={transaction} setTransaction={setTransaction} />
          <TextField
            label="Notes"
            value={transaction.notes ?? ''}
            multiline
            rows={3}
            onChange={(e) => setTransaction({ ...transaction, notes: e.target.value })}
          />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Stack direction="column" spacing={2}>
          <Typography variant="h6">Candidates</Typography>
          <Candidates transaction={transaction} setTransaction={setTransaction} />
        </Stack>
      </Grid>
    </Grid>
  );
}

export const TransactionDialog = ({
  initialTransaction,
  currentAccount,
  onClose,
}: {
  initialTransaction: Transaction | null;
  currentAccount: Account;
  onClose: () => void;
}) => {
  const [transaction, setTransaction] = useState<Transaction | null>(initialTransaction);
  useEffect(() => {
    setTransaction(initialTransaction);
  }, [initialTransaction]);

  const {
    mutate: updateTransactionMutation,
    isPending,
    error,
  } = useUpdateTransaction(currentAccount.id, transaction!, onClose);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Dialog open={!!transaction} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <Loader open={isPending} />
      <DialogTitle>Edit transaction</DialogTitle>
      <DialogContent>
        {transaction && (
          <TransactionForm
            transaction={transaction}
            setTransaction={setTransaction}
            currentAccount={currentAccount}
          />
        )}
      </DialogContent>
      <DialogActions>
        {error && <Alert severity="error">{error.message}</Alert>}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => updateTransactionMutation()}
          disabled={isPending || !(transaction?.account_id || transaction?.account_name)}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
