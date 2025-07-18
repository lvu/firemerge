import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { Transaction, TransactionType } from '../types/backend';
import { TransactionTypeLabel } from './TransactionTypeLabel';

export const TransactionTypeInput = ({
  transaction,
  setTransaction,
}: {
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
}) => {
  const onChange = (_: React.MouseEvent<HTMLElement>, value?: string) => {
    if (value) {
      setTransaction({ ...transaction, type: value as TransactionType });
    }
  };
  return (
    <ToggleButtonGroup value={transaction.type} onChange={onChange} exclusive>
      <ToggleButton value="withdrawal">
        <TransactionTypeLabel type="withdrawal" />
      </ToggleButton>
      <ToggleButton value="transfer-in">
        <TransactionTypeLabel type="transfer-in" />
      </ToggleButton>
      <ToggleButton value="transfer-out">
        <TransactionTypeLabel type="transfer-out" />
      </ToggleButton>
      <ToggleButton value="deposit">
        <TransactionTypeLabel type="deposit" />
      </ToggleButton>
      ;
    </ToggleButtonGroup>
  );
};
