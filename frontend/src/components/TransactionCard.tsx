import { Button, Chip, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { Account, Transaction } from '../types/backend';
import { useState } from 'react';
import { TransactionTypeInput } from './TransactionTypeInput';
import { DescriptionInput } from './DescriptionInput';
import { CategoryInput } from './CategoryInput';
import { AccountInput } from './AccountInput';
import { Candidates } from './Candidates';
import { getCurrencies, updateTransaction } from '../services/backend';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader } from './Loader';

const dateFormat = new Intl.DateTimeFormat(navigator.language, {
  hour12: false,
  dateStyle: 'long',
  timeStyle: 'short',
});

export const TransactionCard = ({
  initialTransaction,
  currentAccount,
  visible,
}: {
  initialTransaction: Transaction;
  currentAccount: Account;
  visible: boolean;
}) => {
  const queryClient = useQueryClient();
  const { data: currencies } = useQuery({
    queryKey: ['global', 'currencies'],
    queryFn: () => getCurrencies(),
    staleTime: Infinity,
  });
  const {
    mutate: updateTransactionMutation,
    isPending,
    error,
  } = useMutation({
    mutationFn: (transaction: Transaction) => updateTransaction(currentAccount.id, transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global', 'transactions', currentAccount.id] });
      queryClient.invalidateQueries({ queryKey: ['global', 'accounts'] });
    },
  });
  const [transaction, setTransaction] = useState<Transaction>(initialTransaction);
  const theme = useTheme();

  if (!visible) return null;

  const bgColor = {
    new: theme.palette.info.main,
    matched: theme.palette.text.secondary,
    annotated: theme.palette.success.main,
    unmatched: theme.palette.warning.main,
  }[transaction.state];
  const currencySymbol = currencies?.find((c) => c.id === currentAccount.currency_id)?.symbol;
  return (
    <Stack
      component="fieldset"
      disabled={transaction.state !== 'new' && transaction.state !== 'annotated'}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        boxShadow: 1,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: alpha(bgColor, 0.1),
      }}
    >
      <Loader open={isPending} />
      <Stack direction="row" spacing={2} sx={{ display: 'flex' }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {currencySymbol}
          {transaction.amount}
        </Typography>
        <Typography variant="subtitle1" sx={{ flex: 1 }}>
          {dateFormat.format(Date.parse(transaction.date))}
        </Typography>
        <Chip label={transaction.state} sx={{ flex: 0, alignSelf: 'flex-end' }} />
      </Stack>
      <Stack direction="row" spacing={2} sx={{ display: 'flex' }}>
        <Stack direction="column" spacing={2} sx={{ flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <TransactionTypeInput transaction={transaction} setTransaction={setTransaction} />
            <Tooltip title={error?.message ?? ''}>
              <Button
                variant="contained"
                color={error ? 'error' : 'primary'}
                onClick={() => {
                  updateTransactionMutation(transaction);
                }}
              >
                Save
              </Button>
            </Tooltip>
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
        <Stack direction="column" spacing={2} sx={{ flex: 1 }}>
          <Candidates transaction={transaction} setTransaction={setTransaction} />
        </Stack>
      </Stack>
    </Stack>
  );
};
