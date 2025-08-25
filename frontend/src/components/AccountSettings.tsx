import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Autocomplete,
  Chip,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import { ExpandMore, Settings, Code, Tune, Block, Input } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import {
  useAccountSettings,
  useUpdateAccountSettings,
  useRepoStatementParserSettings,
} from '../hooks/backend';
import type {
  Account,
  AccountSettings,
  ColumnInfo,
  StatementParserSettings,
  StatementFormatSettingsCSV,
  StatementFormat,
} from '../types/backend';

// Default parser settings

const defaultCSVSettings: StatementFormatSettingsCSV = {
  format: 'csv',
  separator: ',',
  encoding: 'utf-8',
};

const defaultParserSettings: StatementParserSettings = {
  columns: [],
  format: defaultCSVSettings,
  decimal_separator: '.',
  date_format: '%d.%m.%Y %H:%M',
};

const defaultSettings: AccountSettings = {
  blacklist: [],
  parser_settings: defaultParserSettings,
};

const columnRoles = [
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name/Description' },
  { value: 'iban', label: 'IBAN' },
  { value: 'currency_code', label: 'Currency Code' },
  { value: 'amount', label: 'Amount' },
  { value: 'amount_debit', label: 'Amount Debit' },
  { value: 'amount_credit', label: 'Amount Credit' },
  { value: 'foreign_currency_code', label: 'Foreign Currency Code' },
  { value: 'foreign_amount', label: 'Foreign Amount' },
  { value: 'doc_number', label: 'Document Number' },
];

const dateFormats = [
  { value: '%d.%m.%Y %H:%M', label: 'DD.MM.YYYY HH:MM' },
  { value: '%d.%m.%Y %H:%M:%S', label: 'DD.MM.YYYY HH:MM:SS' },
  { value: '%Y-%m-%d', label: 'YYYY-MM-DD' },
  { value: '%Y-%m-%d %H:%M', label: 'YYYY-MM-DD HH:MM' },
  { value: '%m/%d/%Y', label: 'MM/DD/YYYY' },
  { value: '%d/%m/%Y', label: 'DD/MM/YYYY' },
];

const encodings = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'cp1251', label: 'Windows-1251' },
  { value: 'iso-8859-1', label: 'ISO-8859-1' },
  { value: 'latin1', label: 'Latin-1' },
];

const separators = [
  { value: ';', label: 'Semicolon (;)' },
  { value: ',', label: 'Comma (,)' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe (|)' },
];

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
  const [settings, setSettings] = useState<AccountSettings>(defaultSettings);
  const [jsonError, setJsonError] = useState<string>('');

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        ...initialSettings,
        parser_settings: initialSettings.parser_settings || defaultParserSettings,
      });
    }
  }, [initialSettings]);

  const handleSave = () => {
    updateSettings(settings);
    onClose();
  };

  const updateParserSettings = (
    f: (settings: StatementParserSettings) => StatementParserSettings,
  ) => {
    setSettings((prev) => ({
      ...prev,
      parser_settings: f(prev.parser_settings || defaultParserSettings),
    }));
  };

  const handleConfigSelect = (configLabel: string) => {
    const config = configs?.find((c) => c.label === configLabel);
    if (config) {
      updateParserSettings(() => config);
      setSelectedConfig(configLabel);
    }
  };

  const updateColumn = (index: number, field: keyof ColumnInfo, value: string | undefined) => {
    updateParserSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((col, i) => (i === index ? { ...col, [field]: value } : col)),
    }));
  };

  const addColumn = () => {
    updateParserSettings((prev) => ({
      ...prev,
      columns: [
        ...(prev.columns || []),
        {
          name: '',
        },
      ],
    }));
  };

  const removeColumn = (index: number) => {
    updateParserSettings((prev) => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index),
    }));
  };

  const updateSeparator = (value: string) => {
    updateParserSettings((prev) => {
      return {
        ...prev,
        format: { ...prev.format, separator: value },
      };
    });
  };

  const updateEncoding = (value: string) => {
    updateParserSettings((prev) => ({
      ...prev,
      format: { ...prev.format, encoding: value },
    }));
  };

  const updateFormat = (format: StatementFormat) => {
    updateParserSettings((prev) => ({
      ...prev,
      format: format === 'csv' ? defaultCSVSettings : { format: format },
    }));
  };

  const handleJsonChange = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setSettings(parsed);
      setJsonError('');
    } catch (error) {
      setJsonError(
        `Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const renderUIView = () => (
    <Box sx={{ mt: 2 }}>
      {/* Config Selection */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Input />
            <Typography variant="h6">Statement Parser Configuration</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Load Predefined Configuration
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Select Configuration</InputLabel>
              <Select
                value={selectedConfig}
                onChange={(e) => handleConfigSelect(e.target.value)}
                label="Select Configuration"
                disabled={isLoadingConfigs}
              >
                <MenuItem value="">
                  <em>Choose a configuration...</em>
                </MenuItem>
                {configs?.map((config) => (
                  <MenuItem key={config.label} value={config.label}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Format Settings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              File Format
            </Typography>
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
            >
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  value={settings.parser_settings?.format.format || ''}
                  onChange={(e) => updateFormat(e.target.value as StatementFormat)}
                  label="Format"
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="xlsx">Excel (XLSX)</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                </Select>
              </FormControl>

              {settings.parser_settings?.format.format === 'csv' && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Encoding</InputLabel>
                    <Select
                      value={
                        (settings.parser_settings.format as StatementFormatSettingsCSV).encoding ||
                        'utf-8'
                      }
                      onChange={(e) => updateEncoding(e.target.value)}
                      label="Encoding"
                    >
                      {encodings.map((enc) => (
                        <MenuItem key={enc.value} value={enc.value}>
                          {enc.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Separator</InputLabel>
                    <Select
                      value={
                        (settings.parser_settings.format as StatementFormatSettingsCSV).separator ||
                        ','
                      }
                      onChange={(e) => updateSeparator(e.target.value)}
                      label="Separator"
                    >
                      {separators.map((sep) => (
                        <MenuItem key={sep.value} value={sep.value}>
                          {sep.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}
            </Box>
          </Box>

          {/* Date and Number Format Settings */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Format Settings
            </Typography>
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
            >
              <FormControl fullWidth>
                <InputLabel>Date Format</InputLabel>
                <Select
                  value={settings.parser_settings?.date_format || '%d.%m.%Y %H:%M'}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      parser_settings: prev.parser_settings
                        ? {
                            ...prev.parser_settings,
                            date_format: e.target.value,
                          }
                        : undefined,
                    }))
                  }
                  label="Date Format"
                >
                  {dateFormats.map((format) => (
                    <MenuItem key={format.value} value={format.value}>
                      {format.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Decimal Separator"
                value={settings.parser_settings?.decimal_separator || ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    parser_settings: prev.parser_settings
                      ? {
                          ...prev.parser_settings,
                          decimal_separator: e.target.value || undefined,
                        }
                      : undefined,
                  }))
                }
                helperText="Leave empty for standard (.)"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Column Mapping */}
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">Column Mapping</Typography>
              <Button variant="outlined" onClick={addColumn} size="small">
                Add Column
              </Button>
            </Box>

            {settings.parser_settings?.columns?.map((column, index) => (
              <Box
                key={index}
                sx={{
                  mb: 2,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' },
                    gap: 2,
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    fullWidth
                    label="Column Name"
                    value={column.name}
                    onChange={(e) => updateColumn(index, 'name', e.target.value)}
                    placeholder="e.g., Дата операції"
                  />

                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={column.role || ''}
                      onChange={(e) => updateColumn(index, 'role', e.target.value || undefined)}
                      label="Role"
                    >
                      <MenuItem value="">
                        <em>No role</em>
                      </MenuItem>
                      {columnRoles.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          {role.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Notes Label"
                    value={column.notes_label || ''}
                    onChange={(e) =>
                      updateColumn(index, 'notes_label', e.target.value || undefined)
                    }
                    placeholder="Optional label for notes"
                  />

                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => removeColumn(index)}
                    size="small"
                  >
                    Remove
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <Block />
            <Typography variant="h6">Blacklist Settings</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Transactions containing these terms in their description will be filtered out.
          </Typography>
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={settings.blacklist}
            onChange={(_, value) => setSettings((prev) => ({ ...prev, blacklist: value }))}
            renderValue={(value: readonly string[], getItemProps) =>
              value.map((option: string, index: number) => {
                const { key, ...itemProps } = getItemProps({ index });
                return <Chip variant="outlined" label={option} key={key} {...itemProps} />;
              })
            }
            renderInput={(params) => <TextField {...params} label="Blacklist Terms" />}
          />
        </AccordionDetails>
      </Accordion>
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
        <Button
          onClick={() => {
            onClose();
            setSettings(initialSettings || defaultSettings);
          }}
        >
          Cancel
        </Button>
        {!isLoadingSettings && (
          <Button onClick={handleSave} variant="contained">
            Save Settings
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
