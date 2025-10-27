import {
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuList,
  Typography,
  Switch,
  ListItem,
} from '@mui/material';
import type { Account, StatementTransaction } from '../types/backend';
import {
  AccountBalanceWallet,
  FileUpload,
  AddBox,
  Settings,
  Output,
  Refresh,
} from '@mui/icons-material';
import { useState } from 'react';
import { StatementUploadDialog } from './Statement';
import { StatementExportDialog } from './StatementExport';
import { AccountSettingsDialog } from './AccountSettings';
import { useRefresh } from '../hooks/backend';
import { ColorThemeSelector } from './ColorTheme';

const MenuItem = ({
  icon,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}) => {
  return (
    <ListItemButton onClick={onClick} sx={{ pr: 4 }}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={text} />
    </ListItemButton>
  );
};

export const MenuDrawer = ({
  open,
  onClose,
  currentAccount,
  setCurrentAccount,
  statement,
  setStatement,
  showMatched,
  setShowMatched,
}: {
  open: boolean;
  onClose: () => void;
  currentAccount: Account | null;
  setCurrentAccount: (account: Account | null) => void;
  statement: StatementTransaction[] | null;
  setStatement: (statement: StatementTransaction[] | null) => void;
  showMatched: boolean;
  setShowMatched: (showMatched: boolean) => void;
}) => {
  const { refresh } = useRefresh();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [statementExportDialogOpen, setStatementExportDialogOpen] = useState(false);
  const [accountSettingsDialogOpen, setAccountSettingsDialogOpen] = useState(false);
  const drawerWidth = '25rem';
  return (
    <>
      {currentAccount && (
        <>
          <StatementUploadDialog
            open={uploadDialogOpen}
            onClose={() => setUploadDialogOpen(false)}
            statement={statement}
            accountId={currentAccount.id}
            setStatement={setStatement}
          />
          <StatementExportDialog
            open={statementExportDialogOpen}
            onClose={() => setStatementExportDialogOpen(false)}
            account={currentAccount}
          />
          <AccountSettingsDialog
            open={accountSettingsDialogOpen}
            onClose={() => setAccountSettingsDialogOpen(false)}
            account={currentAccount}
          />
        </>
      )}
      <Drawer
        open={open}
        onClose={onClose}
        aria-hidden={!open}
        sx={{
          width: drawerWidth,
        }}
      >
        <ColorThemeSelector />
        <Typography variant="h6" component="h2" sx={{ p: 2 }}>
          Actions
        </Typography>
        <MenuList>
          {statement !== null && (
            <ListItem>
              <ListItemIcon>
                <Switch
                  checked={showMatched}
                  onChange={() => {
                    setShowMatched(!showMatched);
                    onClose();
                  }}
                />
              </ListItemIcon>
              <ListItemText primary="Show matched" />
            </ListItem>
          )}
          {statement !== null && (
            <MenuItem
              icon={<Refresh />}
              text="Refresh"
              onClick={() => {
                refresh();
                onClose();
              }}
            />
          )}
          <MenuItem
            icon={<AccountBalanceWallet />}
            text="Change account"
            onClick={() => {
              setCurrentAccount(null);
              onClose();
            }}
          />
          <MenuItem
            icon={<Output />}
            text="Export statement"
            onClick={() => {
              setStatementExportDialogOpen(true);
              onClose();
            }}
          />
          <MenuItem
            icon={<Settings />}
            text="Account settings"
            onClick={() => {
              setAccountSettingsDialogOpen(true);
              onClose();
            }}
          />
          <MenuItem
            icon={<FileUpload />}
            text="Upload statement"
            onClick={() => {
              setStatement(null);
              onClose();
            }}
          />
          {statement !== null && (
            <MenuItem
              icon={<AddBox />}
              text="Upload additional statement"
              onClick={() => {
                setUploadDialogOpen(true);
                onClose();
              }}
            />
          )}
        </MenuList>
      </Drawer>
    </>
  );
};
