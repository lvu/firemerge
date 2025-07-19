import type { Account } from '../types/backend';
import { Alert, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useAccounts } from '../hooks/backend';

export const CurrentAccount = ({
  currentAccount,
  setCurrentAccount,
}: {
  currentAccount: Account | null;
  setCurrentAccount: (account: Account | null) => void;
}) => {
  const { data: accounts, error } = useAccounts();
  const assetAccounts = Object.values(accounts ?? {})
    .filter((a) => a.type === 'asset')
    .sort((a, b) => a.name.localeCompare(b.name));

  if (error) {
    return <Alert severity="error">Error: {error.message}</Alert>;
  }

  return (
    <FormControl sx={{ width: 0.8 }}>
      <InputLabel id="current-account-label">Current account</InputLabel>
      <Select
        labelId="current-account-label"
        label="Current account"
        value={currentAccount?.id ?? ''}
        onChange={(e) => setCurrentAccount(accounts?.[Number(e.target.value)] ?? null)}
        name="current-account"
      >
        {assetAccounts.map((account) => (
          <MenuItem key={account.id} value={account.id}>
            {account.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
