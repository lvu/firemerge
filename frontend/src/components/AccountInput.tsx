import { Autocomplete, TextField, type FilterOptionsState } from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import type { Account, AccountType, Transaction } from '../types/backend';
import { useRef } from 'react';
import { useAccounts } from '../hooks/backend';

const filter = createFilterOptions<Account>();

export const AccountInput = ({
  transaction,
  setTransaction,
}: {
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
}) => {
  const newAccount = useRef<Account | null>(null);
  const { data: allAccounts, isLoading } = useAccounts();
  const accountTypes: AccountType[] =
    {
      withdrawal: ['expense' as AccountType, 'liabilities' as AccountType, 'debt' as AccountType],
      'transfer-in': ['asset' as AccountType, 'cash' as AccountType],
      'transfer-out': ['asset' as AccountType, 'cash' as AccountType],
      deposit: ['revenue' as AccountType, 'debt' as AccountType, 'liabilities' as AccountType],
      reconciliation: [],
    }[transaction.type] ?? [];
  const accounts = Object.values(allAccounts ?? {})
    .filter((a) => accountTypes.includes(a.type))
    .sort((a, b) => a.id - b.id);
  if (newAccount.current) {
    accounts.push(newAccount.current);
  }
  const value: Account =
    !transaction.account_id && transaction.account_name
      ? {
          id: -2,
          name: transaction.account_name,
          type: 'asset',
          currency_id: -1,
        }
      : (accounts?.find((a) => a.id === transaction.account_id) ?? {
          id: -1,
          name: '',
          type: 'asset',
          currency_id: -1,
        });
  return (
    <Autocomplete
      options={accounts ?? []}
      getOptionLabel={(option) => (option.id !== -2 ? option.name : `Add account: ${option.name}`)}
      value={value}
      filterOptions={(options: Account[], state: FilterOptionsState<Account>) => {
        const result = filter(options, state);
        const isExisting = options.some((o) => o.name === state.inputValue);
        if (!isExisting && state.inputValue) {
          result.push({
            id: -2,
            name: state.inputValue,
            type: 'asset',
            currency_id: -1,
          });
        }
        return result;
      }}
      renderInput={(params) => <TextField {...params} label="Account" />}
      loading={isLoading}
      onChange={(_, value) => {
        newAccount.current = value?.id === -2 ? value : null;
        setTransaction({
          ...transaction,
          account_id: (value?.id ?? -1) < 0 ? undefined : value?.id,
          account_name: value?.name,
        });
      }}
    />
  );
};
