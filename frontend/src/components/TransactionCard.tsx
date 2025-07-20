import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { Account, Transaction } from '../types/backend';
import { useState } from 'react';
import { TransactionTypeInput } from './TransactionTypeInput';
import { DescriptionInput } from './DescriptionInput';
import { CategoryInput } from './CategoryInput';
import { AccountInput } from './AccountInput';
import { Candidates } from './Candidates';
import { Loader } from './Loader';
import { useCurrencies, useUpdateTransaction } from '../hooks/backend';

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
  const { data: currencies } = useCurrencies();
  const [transaction, setTransaction] = useState<Transaction>(initialTransaction);
  const {
    mutate: updateTransactionMutation,
    isPending,
    error,
  } = useUpdateTransaction(currentAccount.id, transaction);

  const theme = useTheme();

  if (!visible || !transaction) return null;

  const isEditable = transaction.state === 'new' || transaction.state === 'annotated';

  const bgColor = {
    new: theme.palette.info.main,
    matched: theme.palette.text.secondary,
    annotated: theme.palette.success.main,
    unmatched: theme.palette.warning.main,
  }[transaction.state];
  const currencySymbol = currencies?.[currentAccount.currency_id]?.symbol ?? '';
  return (
    <Card
      component="fieldset"
      disabled={!isEditable}
      sx={{
        backgroundColor: alpha(bgColor, 0.1),
        position: 'relative',
      }}
    >
      <Loader open={isPending} />
      <CardHeader
        title={
          <Typography variant="h6" sx={{ flex: 1 }}>
            {currencySymbol}
            {transaction.amount}
          </Typography>
        }
        subheader={
          <Typography variant="subtitle1" sx={{ flex: 1 }}>
            {dateFormat.format(Date.parse(transaction.date))}
          </Typography>
        }
        action={<Chip label={transaction.state} sx={{ flex: 0, alignSelf: 'flex-end' }} />}
      />
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ display: 'flex' }}>
          <Stack direction="column" spacing={2} sx={{ flex: 1 }}>
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
          <Stack direction="column" spacing={2} sx={{ flex: 1 }}>
            <Candidates transaction={transaction} setTransaction={setTransaction} />
          </Stack>
        </Stack>
      </CardContent>
      {isEditable && (
        <CardActions>
          <Tooltip title={error?.message ?? ''}>
            <Button
              variant="contained"
              color={error ? 'error' : 'primary'}
              onClick={() => updateTransactionMutation()}
            >
              Save
            </Button>
          </Tooltip>
        </CardActions>
      )}
    </Card>
  );
};
