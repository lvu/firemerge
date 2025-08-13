import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Autocomplete,
  Chip,
  DialogActions,
  Button,
} from '@mui/material';
import type { Account, AccountSettings } from '../types/backend';
import { useEffect, useState } from 'react';
import { useAccountSettings, useUpdateAccountSettings } from '../hooks/backend';

export const AccountSettingsDialog = ({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: Account;
}) => {
  const { data: initialSettings, isLoading: isLoadingSettings } = useAccountSettings(account.id);
  const { mutate: updateSettings } = useUpdateAccountSettings(account.id);
  const [settings, setSettings] = useState<AccountSettings | null>(initialSettings ?? null);
  useEffect(() => {
    setSettings(initialSettings ?? null);
  }, [initialSettings]);

  return (
    <Dialog open={open} onClose={onClose} aria-hidden={!open}>
      <DialogTitle>Account Settings: {account.name}</DialogTitle>
      <DialogContent>
        {isLoadingSettings ? (
          <div>Loading...</div>
        ) : (
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={settings?.blacklist ?? []}
            renderValue={(value: readonly string[], getItemProps) =>
              value.map((option: string, index: number) => {
                const { key, ...itemProps } = getItemProps({ index });
                return <Chip variant="outlined" label={option} key={key} {...itemProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Blacklist" />}
            onChange={(_, value) => {
              setSettings({ ...settings, blacklist: value });
            }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {settings !== null && !isLoadingSettings && (
          <Button
            onClick={() => {
              updateSettings(settings);
              onClose();
            }}
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
