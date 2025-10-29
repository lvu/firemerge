import type { Account } from '../types/backend';
import { Typography, MenuList, Box, ListItemButton, ListItemText, Alert } from '@mui/material';
import { useAccounts } from '../hooks/backend';

export const CurrentAccountChoice = ({
  setCurrentAccount,
}: {
  setCurrentAccount: (account: Account | null) => void;
}) => {
  const { data: accounts, error: accountsError } = useAccounts();
  if (accountsError) {
    return <Alert severity="error">Error: {accountsError.message}</Alert>;
  }
  const assetAccounts = Object.values(accounts ?? {})
    .filter((a) => a.type === 'asset')
    .sort((a, b) => a.id - b.id);
  return (
    <Box sx={{ gap: 2, p: 2 }}>
      <Typography variant="h6">Select account</Typography>
      <MenuList>
        {assetAccounts.map((account) => (
          <ListItemButton
            key={account.id}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 0.5 }}
            onClick={() => setCurrentAccount(account)}
          >
            <ListItemText primary={account.name} />
          </ListItemButton>
        ))}
      </MenuList>
    </Box>
  );
};
