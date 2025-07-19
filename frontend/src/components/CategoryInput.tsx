import { Autocomplete, TextField } from '@mui/material';
import type { Transaction } from '../types/backend';
import { useCategories } from '../hooks/backend';

export const CategoryInput = ({
  transaction,
  setTransaction,
}: {
  transaction: Transaction;
  setTransaction: (transaction: Transaction) => void;
}) => {
  const { data: categories, isLoading } = useCategories();
  return (
    <Autocomplete
      options={Object.values(categories ?? {}).sort((a, b) => a.name.localeCompare(b.name))}
      getOptionLabel={(option) => option.name}
      value={categories?.[transaction.category_id!] ?? { id: -1, name: '' }}
      renderInput={(params) => <TextField {...params} label="Category" />}
      loading={isLoading}
      onChange={(_, value) => setTransaction({ ...transaction, category_id: value?.id })}
    />
  );
};
