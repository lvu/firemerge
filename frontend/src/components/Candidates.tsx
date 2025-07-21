import {
  Table,
  TableCell,
  TableRow,
  TableHead,
  TableBody,
  Tooltip,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import { enrichTransaction, type Transaction, type TransactionCandidate } from '../types/backend';
import type { Category, Account } from '../types/backend';
import { TransactionTypeLabel } from './TransactionTypeLabel';
import { useAccounts, useCategories } from '../hooks/backend';

const CandidateRow = ({
  candidate,
  categories,
  accounts,
  transaction,
  setTransaction,
}: {
  candidate: TransactionCandidate;
  categories: Record<number, Category>;
  accounts: Record<number, Account>;
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
}) => {
  const onRowDoubleClick = (candidate: TransactionCandidate) => {
    setTransaction(enrichTransaction(transaction, candidate));
  };

  return (
    <Tooltip
      title={
        <Stack>
          <Typography variant="body1">{candidate.score}</Typography>
          <Typography variant="caption">{candidate.date}</Typography>
          <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
            {candidate.notes ?? ''}
          </Box>
        </Stack>
      }
    >
      <TableRow
        sx={{
          '&:hover': {
            bgcolor: 'action.hover',
          },
          cursor: 'pointer',
        }}
        onDoubleClick={() => onRowDoubleClick(candidate)}
      >
        <TableCell>
          <TransactionTypeLabel type={candidate.type} />
        </TableCell>
        <TableCell>{candidate.description}</TableCell>
        <TableCell>{categories?.[candidate.category_id!]?.name ?? ''}</TableCell>
        <TableCell>{accounts?.[candidate.account_id!]?.name ?? ''}</TableCell>
      </TableRow>
    </Tooltip>
  );
};

export const Candidates = ({
  transaction,
  setTransaction,
}: {
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
}) => {
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  if (
    (transaction.state !== 'new' && transaction.state !== 'enriched') ||
    !transaction.candidates
  ) {
    return null;
  }
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Type</TableCell>
          <TableCell>Description</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Account</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {transaction.candidates.map((candidate, index) => (
          <CandidateRow
            key={index}
            candidate={candidate}
            categories={categories!}
            accounts={accounts!}
            transaction={transaction}
            setTransaction={setTransaction}
          />
        ))}
      </TableBody>
    </Table>
  );
};
