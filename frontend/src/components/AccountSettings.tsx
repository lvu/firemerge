import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
} from '@mui/material';
import { Settings, Code, Tune } from '@mui/icons-material';
import { useState } from 'react';
import { useAccountSettings, useUpdateAccountSettings, useRepoStatementParserSettings } from '../hooks/backend';
import type { Account } from '../types/backend';
import {
  StatementParserConfig,
  ExportConfig,
  BlacklistConfig,
  useAccountSettingsState,
} from './AccountSettings/index';

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
  const { data: configs, isLoading: isLoadingConfigs } = useRepoStatementParserSettings();
  const { mutate: updateSettings } = useUpdateAccountSettings(account.id);

  const [viewMode, setViewMode] = useState<'ui' | 'json'>('ui');
  const [selectedConfig, setSelectedConfig] = useState<string>('');

  const {
    settings,
    jsonError,
    updateSettings: updateSettingsState,
    updateParserSettings,
    updateExportSettings,
    removeExportSettings,
    enableExportSettings,
    handleJsonChange,
    resetToInitial,
  } = useAccountSettingsState(initialSettings || null);

  const handleSave = () => {
    updateSettings(settings);
    onClose();
  };

  const handleConfigSelect = (configLabel: string) => {
    const config = configs?.find((c) => c.label === configLabel);
    if (config) {
      updateParserSettings(() => config);
      setSelectedConfig(configLabel);
    }
  };

  const handleCancel = () => {
    resetToInitial();
    onClose();
  };

  const renderUIView = () => (
    <Box sx={{ mt: 2 }}>
      <StatementParserConfig
        parserSettings={settings.parser_settings}
        configs={configs}
        selectedConfig={selectedConfig}
        isLoadingConfigs={isLoadingConfigs}
        onUpdateParserSettings={updateParserSettings}
        onConfigSelect={handleConfigSelect}
      />

      <ExportConfig
        exportSettings={settings.export_settings}
        onUpdateExportSettings={updateExportSettings}
        onRemoveExportSettings={removeExportSettings}
        onEnableExportSettings={enableExportSettings}
      />

      <BlacklistConfig
        settings={settings}
        onUpdate={(blacklist) => updateSettingsState((prev) => ({ ...prev, blacklist }))}
      />
    </Box>
  );

  const renderJSONView = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Edit the configuration as JSON. Make sure to maintain valid JSON format.
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={20}
        value={JSON.stringify(settings, null, 2)}
        onChange={(e) => handleJsonChange(e.target.value)}
        error={!!jsonError}
        helperText={jsonError}
        sx={{ fontFamily: 'monospace' }}
      />
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth aria-hidden={!open}>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Settings />
          Account Settings: {account.name}
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoadingSettings || isLoadingConfigs ? (
          <div>Loading...</div>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={viewMode} onChange={(_, newValue) => setViewMode(newValue)}>
                <Tab icon={<Tune />} label="UI Editor" value="ui" iconPosition="start" />
                <Tab icon={<Code />} label="JSON Editor" value="json" iconPosition="start" />
              </Tabs>
            </Box>

            {viewMode === 'ui' ? renderUIView() : renderJSONView()}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        {!isLoadingSettings && (
          <Button onClick={handleSave} variant="contained">
            Save Settings
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
