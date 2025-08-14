import type { Account, Transaction } from '../types/backend';
import { useCurrencies } from '../hooks/backend';
import { Typography } from '@mui/material';
import { Box } from '@mui/system';

const dateFormat = new Intl.DateTimeFormat(navigator.language, {
  hour12: false,
  dateStyle: 'full',
  timeStyle: 'short',
});

export const TransactionHeader = ({
  transaction,
  currentAccount,
}: {
  transaction: Transaction;
  currentAccount: Account;
}) => {
  const { data: currencies } = useCurrencies();

  const currencySymbol = currentAccount.currency_id
    ? (currencies?.[currentAccount.currency_id]?.symbol ?? '')
    : '';
  const foreignCurrencySymbol = transaction.foreign_currency_id
    ? (currencies?.[transaction.foreign_currency_id]?.symbol ?? '')
    : '';

  return (
    <Typography variant="h6" sx={{ flex: 1 }}>
      {currencySymbol} {transaction.amount}
      {transaction.foreign_amount && (
        <Box component="span" sx={{ color: 'text.secondary', ml: 2 }}>
          ({foreignCurrencySymbol} {transaction.foreign_amount})
        </Box>
      )}
    </Typography>
  );
};

export const TransactionSubheader = ({ transaction }: { transaction: Transaction }) => {
  return (
    <Typography variant="body1" sx={{ flex: 1 }}>
      {dateFormat.format(new Date(transaction.date))}
    </Typography>
  );
};
