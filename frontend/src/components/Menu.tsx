import {
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuList,
  Typography,
  Switch,
  ListItem,
  Snackbar,
  Alert,
} from '@mui/material';
import type { Account, StatementTransaction, Transaction } from '../types/backend';
import {
  AccountBalanceWallet,
  FileUpload,
  AddBox,
  Settings,
  Output,
  Refresh,
  SaveAlt,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { StatementUploadDialog } from './Statement';
import { StatementExportDialog } from './StatementExport';
import { AccountSettingsDialog } from './AccountSettings';
import { useRefresh, useBatchUpdateTransactions } from '../hooks/backend';
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
  transactions,
}: {
  open: boolean;
  onClose: () => void;
  currentAccount: Account | null;
  setCurrentAccount: (account: Account | null) => void;
  statement: StatementTransaction[] | null;
  setStatement: (statement: StatementTransaction[] | null) => void;
  showMatched: boolean;
  setShowMatched: (showMatched: boolean) => void;
  transactions: Transaction[] | null;
}) => {
  const { refresh } = useRefresh();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [statementExportDialogOpen, setStatementExportDialogOpen] = useState(false);
  const [accountSettingsDialogOpen, setAccountSettingsDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const drawerWidth = '25rem';

  const annotatedCount = transactions?.filter((t) => t.state === 'annotated').length || 0;

  const showSnackbarMessage = (message: string, severity: 'success' | 'error') => {
    setSnackbarOpen(false);
    setTimeout(() => {
      setSnackbarMessage(message);
      setSnackbarSeverity(severity);
      setSnackbarOpen(true);
    }, 10);
  };

  const { mutate: batchSaveTransactions, error: batchSaveError } = useBatchUpdateTransactions(
    currentAccount?.id,
    transactions || [],
    (total, completed) => {
      showSnackbarMessage(`Saving ${completed} of ${total} transactions...`, 'success');
    },
    () => {
      showSnackbarMessage(`Successfully saved ${annotatedCount} transactions`, 'success');
      onClose();
    },
    (error) => {
      showSnackbarMessage(`Error saving transactions: ${error.message}`, 'error');
      onClose();
    },
  );

  // Handle batch save errors
  useEffect(() => {
    if (batchSaveError) {
      showSnackbarMessage(`Error saving transactions: ${batchSaveError.message}`, 'error');
      onClose();
    }
  }, [batchSaveError, onClose]);
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
          {statement !== null && annotatedCount > 1 && (
            <MenuItem
              icon={<SaveAlt />}
              text={`Save all annotated (${annotatedCount})`}
              onClick={() => {
                batchSaveTransactions();
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
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
