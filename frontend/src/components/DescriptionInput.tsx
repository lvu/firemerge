import { TextField } from '@mui/material';
import type { Transaction } from '../types/backend';
import { searchDescriptions } from '../services/backend';
import { useDebouncedCallback } from 'use-debounce';

export const DescriptionInput = ({
  accountId,
  transaction,
  setTransaction,
}: {
  accountId: number;
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
}) => {
  const updateCandidates = useDebouncedCallback((value: string) => {
    searchDescriptions(accountId, value).then((candidates) =>
      setTransaction({ ...transaction, candidates }),
    );
  }, 500);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransaction({ ...transaction, description: e.target.value });
    updateCandidates(e.target.value);
  };
  return (
    <TextField value={transaction.description ?? ''} onChange={handleChange} label="Description" />
  );
};
