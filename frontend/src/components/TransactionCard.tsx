import {
  Badge,
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { RequestQuoteOutlined } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { enrichTransaction, type Account, type Transaction } from '../types/backend';
import { Loader } from './Loader';
import { useAccounts, useCategories, useCurrencies, useUpdateTransaction } from '../hooks/backend';
import { TransactionTypeLabel } from './TransactionTypeLabel';

const dateFormat = new Intl.DateTimeFormat(navigator.language, {
  hour12: false,
  dateStyle: 'full',
  timeStyle: 'short',
});

const DataField = ({ label, value }: { label: string; value?: string | React.ReactNode }) => {
  return (
    <>
      <Grid size={{ xs: 4, sm: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>
      <Grid size={{ xs: 8, sm: 4 }}>
        <Typography component="div">{value ?? 'N/A'}</Typography>
      </Grid>
    </>
  );
};

export const TransactionCard = ({
  initialTransaction,
  currentAccount,
  visible,
  onEdit,
}: {
  initialTransaction: Transaction;
  currentAccount: Account;
  visible: boolean;
  onEdit: (transaction: Transaction) => void;
}) => {
  const { data: currencies } = useCurrencies();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const transaction =
    initialTransaction.state === 'new' && initialTransaction.candidates?.length === 1
      ? enrichTransaction(initialTransaction, initialTransaction.candidates[0])
      : initialTransaction;

  const {
    mutate: updateTransactionMutation,
    isPending,
    error,
  } = useUpdateTransaction(currentAccount.id, transaction);

  const theme = useTheme();

  if (!visible || !transaction) return null;

  const canSave = transaction.state === 'enriched' || transaction.state === 'annotated';
  const canEdit = transaction.state === 'new' || transaction.state === 'enriched';

  const bgColor = {
    enriched: theme.palette.success.main,
    new: theme.palette.info.main,
    matched: theme.palette.text.secondary,
    annotated: theme.palette.success.main,
    unmatched: theme.palette.warning.main,
  }[transaction.state];

  const currencySymbol = currentAccount.currency_id
    ? (currencies?.[currentAccount.currency_id]?.symbol ?? '')
    : '';
  const foreignCurrencySymbol = transaction.foreign_currency_id
    ? (currencies?.[transaction.foreign_currency_id]?.symbol ?? '')
    : '';

  return (
    <Card
      sx={{
        backgroundColor: alpha(bgColor, 0.1),
        position: 'relative',
      }}
    >
      <Loader open={isPending} />
      <CardActionArea onClick={() => onEdit(transaction)} disabled={!canEdit}>
        <CardHeader
          title={
            <Typography variant="h6" sx={{ flex: 1 }}>
              {currencySymbol} {transaction.amount}
              {transaction.foreign_amount && (
                <Box component="span" sx={{ color: 'text.secondary', ml: 2 }}>
                  ({foreignCurrencySymbol} {transaction.foreign_amount})
                </Box>
              )}
            </Typography>
          }
          subheader={
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              {dateFormat.format(Date.parse(transaction.date))}
            </Typography>
          }
          action={
            <Stack direction="row" spacing={2} alignItems="center">
              {!!transaction.candidates?.length && (
                <Badge badgeContent={transaction.candidates.length} color="primary">
                  <RequestQuoteOutlined />
                </Badge>
              )}
              <Chip label={transaction.state} sx={{ flex: 0, alignSelf: 'flex-end' }} />
            </Stack>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            <DataField
              label="Type"
              value={
                <Stack direction="row" spacing={0.5}>
                  <TransactionTypeLabel type={transaction.type} />
                  <Typography>{transaction.type}</Typography>
                </Stack>
              }
            />
            <DataField label="Description" value={transaction.description} />
            <DataField
              label="Category"
              value={
                (transaction.category_id && categories?.[transaction.category_id]?.name) ?? 'N/A'
              }
            />
            <DataField
              label="Account"
              value={(transaction.account_id && accounts?.[transaction.account_id]?.name) ?? 'N/A'}
            />
          </Grid>
        </CardContent>
      </CardActionArea>
      {canSave && (
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
