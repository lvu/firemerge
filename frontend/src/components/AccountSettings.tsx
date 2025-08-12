import { Settings } from '@mui/icons-material';
import {
  DialogContent,
  DialogTitle,
  Dialog,
  IconButton,
  TextField,
  Autocomplete,
  Chip,
  DialogActions,
  Button,
} from '@mui/material';
import type { Account, AccountSettings } from '../types/backend';
import { useEffect, useState } from 'react';
import { useAccountSettings, useUpdateAccountSettings } from '../hooks/backend';

export default function AccountSettings({ account }: { account: Account }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: initialSettings, isLoading: isLoadingSettings } = useAccountSettings(account.id);
  const { mutate: updateSettings } = useUpdateAccountSettings(account.id);
  const [settings, setSettings] = useState<AccountSettings | null>(initialSettings ?? null);
  useEffect(() => {
    setSettings(initialSettings ?? null);
  }, [initialSettings]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  console.log('initialSettings', initialSettings);
  console.log('settings', settings);

  return (
    <>
      <IconButton onClick={handleOpen}>
        <Settings />
      </IconButton>
      <Dialog open={isOpen} onClose={handleClose}>
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
          <Button onClick={handleClose}>Cancel</Button>
          {settings !== null && !isLoadingSettings && (
            <Button
              onClick={() => {
                updateSettings(settings);
                handleClose();
              }}
            >
              Save
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
