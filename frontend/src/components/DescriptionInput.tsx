import { TextField } from '@mui/material';
import type { Transaction } from '../types/backend';
import { searchDescriptions } from '../services/backend';
import { useDebouncedCallback } from 'use-debounce';
import { useRef, useState } from 'react';

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
  const [isQuerying, setIsQuerying] = useState(false);
  const initialCandidates = useRef(transaction.candidates);
  const updateCandidates = useDebouncedCallback((value: string) => {
    if (value.length < 3) {
      setTransaction({ ...transaction, candidates: initialCandidates.current });
      return;
    }
    onStartQuery();
    setIsQuerying(true);
    searchDescriptions(accountId, value)
      .then((candidates) => setTransaction({ ...transaction, candidates }))
      .finally(() => {
        setIsQuerying(false);
        onEndQuery();
      });
  }, 1000);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransaction({ ...transaction, description: e.target.value });
    updateCandidates(e.target.value);
  };
  return (
    <TextField
      value={transaction.description ?? ''}
      onChange={handleChange}
      label="Description"
      disabled={isQuerying}
    />
  );
};
