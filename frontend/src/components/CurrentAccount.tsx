import type { Account } from '../types/backend';
import { Alert, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useAccounts, useAccountDetails, useCurrencies } from '../hooks/backend';
import { ExpandCircleDown } from '@mui/icons-material';
import { useRef, useState } from 'react';
import { StatementExport } from './StatementExport';

export const CurrentAccount = ({
  currentAccount,
  setCurrentAccount,
}: {
  currentAccount: Account | null;
  setCurrentAccount: (account: Account | null) => void;
}) => {
  const accountMenuRef = useRef<HTMLButtonElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const { data: currencies } = useCurrencies();
  const { data: accounts, error } = useAccounts();
  const { data: currentAccountDetails } = useAccountDetails(currentAccount?.id);

  const assetAccounts = Object.values(accounts ?? {})
    .filter((a) => a.type === 'asset')
    .sort((a, b) => a.id - b.id);

  if (error) {
    return <Alert severity="error">Error: {error.message}</Alert>;
  }

  const accountCurrencySymbol = currentAccountDetails?.currency_id
    ? currencies?.[currentAccountDetails.currency_id]?.symbol
    : '';

  const handleAccountClick = async (account: Account) => {
    setCurrentAccount(account);
    setIsAccountMenuOpen(false);
  };

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      {currentAccount ? (
        <Stack direction="column" spacing={1}>
          <Typography ref={accountMenuRef}>{currentAccount.name}</Typography>
          <Typography>
            {accountCurrencySymbol}&nbsp;{currentAccountDetails?.current_balance}
          </Typography>
        </Stack>
      ) : (
        <Typography ref={accountMenuRef}>No account selected</Typography>
      )}
      <Stack direction="column" alignItems="center" spacing={1}>
        <IconButton onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}>
          <ExpandCircleDown />
        </IconButton>
        {currentAccount && <StatementExport account={currentAccount} />}
        <Menu
          anchorEl={accountMenuRef.current}
          open={isAccountMenuOpen}
          onClose={() => setIsAccountMenuOpen(false)}
        >
          {assetAccounts.map((account) => (
            <MenuItem
              key={account.id}
              value={account.id}
              onClick={() => handleAccountClick(account)}
            >
              {account.name}
            </MenuItem>
          ))}
        </Menu>
      </Stack>
    </Stack>
  );
};
