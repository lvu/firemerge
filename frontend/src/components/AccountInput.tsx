import { Autocomplete, TextField } from '@mui/material';
import type { Account, AccountType, Transaction } from '../types/backend';
import { useQuery } from '@tanstack/react-query';
import { getAccounts } from '../services/backend';

export const AccountInput = ({
  transaction,
  setTransaction,
}: {
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
}) => {
  const { data: allAccounts, isLoading } = useQuery<Account[]>({
    queryKey: ['global', 'accounts'],
    queryFn: () => getAccounts(),
    staleTime: Infinity,
  });
  const accountTypes: AccountType[] =
    {
      withdrawal: ['expense' as AccountType],
      'transfer-in': [
        'asset' as AccountType,
        'liability' as AccountType,
        'cash' as AccountType,
        'debt' as AccountType,
      ],
      'transfer-out': [
        'asset' as AccountType,
        'liability' as AccountType,
        'cash' as AccountType,
        'debt' as AccountType,
      ],
      deposit: ['revenue' as AccountType],
      reconciliation: [],
    }[transaction.type] ?? [];
  const accounts = allAccounts?.filter((a) => accountTypes.includes(a.type));
  return (
    <Autocomplete
      options={accounts ?? []}
      getOptionLabel={(option) => `${option.name}`}
      value={
        accounts?.find((a) => a.id === transaction.account_id) ?? {
          id: -1,
          name: '',
          type: 'asset',
          currency_id: -1,
        }
      }
      renderInput={(params) => <TextField {...params} label="Account" />}
      loading={isLoading}
      onChange={(_, value) => setTransaction({ ...transaction, account_id: value?.id })}
    />
  );
};
