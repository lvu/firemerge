import { Table, TableCell, TableRow, TableHead, TableBody, Tooltip, Box } from '@mui/material';
import type { Transaction, TransactionCandidate } from '../types/backend';
import { useQuery } from '@tanstack/react-query';
import type { Category, Account } from '../types/backend';
import { getAccounts, getCategories } from '../services/backend';
import { TransactionTypeLabel } from './TransactionTypeLabel';

const CandidateRow = ({
  candidate,
  categories,
  accounts,
  transaction,
  setTransaction,
}: {
  candidate: TransactionCandidate;
  categories: Category[];
  accounts: Account[];
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
}) => {
  const onRowDoubleClick = (candidate: TransactionCandidate) => {
    setTransaction({
      ...transaction,
      type: candidate.type,
      description: candidate.description,
      account_id: candidate.account_id,
      category_id: candidate.category_id,
    });
  };

  return (
    <Tooltip
      title={
        <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
          {candidate.notes ?? ''}
        </Box>
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
        <TableCell>{categories?.find((c) => c.id === candidate.category_id)?.name}</TableCell>
        <TableCell>{accounts?.find((a) => a.id === candidate.account_id)?.name}</TableCell>
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
  const { data: categories } = useQuery({
    queryKey: ['global', 'categories'],
    queryFn: () => getCategories(),
    staleTime: Infinity,
  });
  const { data: accounts } = useQuery({
    queryKey: ['global', 'accounts'],
    queryFn: () => getAccounts(),
    staleTime: Infinity,
  });

  if (transaction.state !== 'new' || !transaction.candidates) {
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
