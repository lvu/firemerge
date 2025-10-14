import { TextField } from '@mui/material';
import type { Transaction } from '../types/backend';
import { searchDescriptions } from '../services/backend';
import { useDebouncedCallback } from 'use-debounce';
import { useRef } from 'react';

export const DescriptionInput = ({
  accountId,
  transaction,
  setTransaction,
  onStartQuery,
  onEndQuery,
}: {
  accountId: number;
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
  onStartQuery: () => void;
  onEndQuery: () => void;
}) => {
  const transactionRef = useRef(transaction);
  const initialCandidates = useRef(transaction.candidates);
  const updateCandidates = useDebouncedCallback((value: string) => {
    if (value.length < 3) {
      setTransaction({ ...transactionRef.current, candidates: initialCandidates.current });
      return;
    }
    onStartQuery();
    searchDescriptions(accountId, value)
      .then((candidates) => setTransaction({ ...transactionRef.current, candidates }))
      .finally(onEndQuery);
  }, 1000);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    transactionRef.current = { ...transactionRef.current, description: e.target.value };
    setTransaction(transactionRef.current);
    updateCandidates(e.target.value);
  };
  return (
    <TextField value={transaction.description ?? ''} onChange={handleChange} label="Description" />
  );
};
