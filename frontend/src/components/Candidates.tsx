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
  Button,
} from '@mui/material';
import { enrichTransaction, type Transaction, type TransactionCandidate } from '../types/backend';
import type { Category, Account } from '../types/backend';
import { TransactionTypeLabel } from './TransactionTypeLabel';
import { useAccounts, useCategories } from '../hooks/backend';
import { ArrowCircleUp } from '@mui/icons-material';

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
  const applyCandidate = (candidate: TransactionCandidate) => {
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
        onDoubleClick={() => applyCandidate(candidate)}
      >
        <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1 }}>
          <Button variant="contained" color="primary" onClick={() => applyCandidate(candidate)}>
            <ArrowCircleUp />
          </Button>
        </TableCell>
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
    <Box sx={{ overflowX: 'auto', width: '100%' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1 }}>&nbsp;</TableCell>
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
    </Box>
  );
};
