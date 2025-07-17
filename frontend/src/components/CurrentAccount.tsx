import type { Account } from '../types/backend';
import { useQuery } from '@tanstack/react-query';
import { getAccounts } from '../services/backend';
import { Alert, FormControl, InputLabel, MenuItem, Select } from '@mui/material';



export const CurrentAccount = ({ currentAccount, setCurrentAccount }: { currentAccount: Account | null, setCurrentAccount: (account: Account | null) => void }) => {
    const { data: accounts, error } = useQuery({ queryKey: ['accounts'], queryFn: () => getAccounts() });
    const assetAccounts = new Map<number, Account>(accounts?.filter(a => a.type === 'asset').map(a => [a.id, a]) ?? []);

    if (error) {
        return <Alert severity="error">Error: {error.message}</Alert>;
    }

    return (
        <FormControl sx={{ width: 0.8}}>
          <InputLabel id="current-account-label">Current account</InputLabel>
          <Select
            labelId="current-account-label"
            label="Current account"
            value={currentAccount?.id ?? ''}
            onChange={(e) => setCurrentAccount(assetAccounts.get(Number(e.target.value)) || null)}
            name="current-account"
          >
            {Array.from(assetAccounts.values()).map((account) => (
              <MenuItem key={account.id} value={account.id}>{account.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
    )
}