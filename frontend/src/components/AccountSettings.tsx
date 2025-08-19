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
  Switch,
  FormControlLabel,
  Divider,
  Alert,
} from '@mui/material';
import { ExpandMore, Settings, Upload, TableChart } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useAccountSettings, useUpdateAccountSettings } from '../hooks/backend';
import type { Account, AccountSettings, ColumnMapping, ParsingSettings } from '../types/backend';

// Default parsing settings
const defaultParsingSettings: ParsingSettings = {
  fileType: 'pdf',
  hasHeader: true,
  skipRows: 0,
  dateFormat: '%d.%m.%Y %H:%M',
  decimalSeparator: '.',
  thousandsSeparator: ' ',
  columns: [
    { name: 'Дата операції', role: 'date', required: true, format: '%d.%m.%Y %H:%M' },
    { name: 'Деталі операції', role: 'description', required: true },
    { name: 'Сума у валюті рахунку', role: 'amount', required: true, decimalSeparator: '.', thousandsSeparator: ' ' },
    { name: 'Сума у валюті операції', role: 'foreign_amount', required: false, decimalSeparator: '.', thousandsSeparator: ' ' },
    { name: 'Валюта операції', role: 'foreign_currency', required: false },
  ],
  blacklist: [],
};

const columnRoles = [
  { value: 'date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'foreign_amount', label: 'Foreign Amount' },
  { value: 'foreign_currency', label: 'Foreign Currency' },
  { value: 'category', label: 'Category' },
  { value: 'account', label: 'Account' },
  { value: 'notes', label: 'Notes' },
  { value: 'ignore', label: 'Ignore' },
];

const dateFormats = [
  { value: '%d.%m.%Y %H:%M', label: 'DD.MM.YYYY HH:MM' },
  { value: '%d.%m.%Y %H:%M:%S', label: 'DD.MM.YYYY HH:MM:SS' },
  { value: '%Y-%m-%d', label: 'YYYY-MM-DD' },
  { value: '%Y-%m-%d %H:%M', label: 'YYYY-MM-DD HH:MM' },
  { value: '%m/%d/%Y', label: 'MM/DD/YYYY' },
  { value: '%d/%m/%Y', label: 'DD/MM/YYYY' },
];

const fileTypes = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
];

const encodings = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'cp1251', label: 'Windows-1251' },
  { value: 'iso-8859-1', label: 'ISO-8859-1' },
  { value: 'latin1', label: 'Latin-1' },
];

const delimiters = [
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
  const { mutate: updateSettings } = useUpdateAccountSettings(account.id);

  // Parse existing settings or use defaults
  const [parsingSettings, setParsingSettings] = useState<ParsingSettings>(() => {
    if (initialSettings?.parsingSettings) {
      return { ...defaultParsingSettings, ...initialSettings.parsingSettings };
    }
    return defaultParsingSettings;
  });

  const [blacklist, setBlacklist] = useState<string[]>(initialSettings?.blacklist ?? []);

  useEffect(() => {
    if (initialSettings) {
      setBlacklist(initialSettings.blacklist ?? []);
      if (initialSettings.parsingSettings) {
        setParsingSettings({ ...defaultParsingSettings, ...initialSettings.parsingSettings });
      }
    }
  }, [initialSettings]);

  const handleSave = () => {
    const settings: AccountSettings = {
      blacklist,
      parsingSettings,
    };
    updateSettings(settings);
    onClose();
  };

  const addColumn = () => {
    setParsingSettings(prev => ({
      ...prev,
      columns: [...prev.columns, { name: '', role: 'ignore', required: false }]
    }));
  };

  const updateColumn = (index: number, field: keyof ColumnMapping, value: any) => {
    setParsingSettings(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) =>
        i === index ? { ...col, [field]: value } : col
      )
    }));
  };

  const removeColumn = (index: number) => {
    setParsingSettings(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-hidden={!open}>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Settings />
          Account Settings: {account.name}
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoadingSettings ? (
          <div>Loading...</div>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Upload />
                  <Typography variant="h6">Statement Parsing Configuration</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Configure how to parse bank statements for this account. This replaces the hardcoded parsers with flexible settings.
                </Alert>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  {/* File Type and Basic Settings */}
                  <Box>
                    <FormControl fullWidth>
                      <InputLabel>File Type</InputLabel>
                      <Select
                        value={parsingSettings.fileType}
                        onChange={(e) => setParsingSettings(prev => ({ ...prev, fileType: e.target.value as any }))}
                        label="File Type"
                      >
                        {fileTypes.map(type => (
                          <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={parsingSettings.hasHeader}
                          onChange={(e) => setParsingSettings(prev => ({ ...prev, hasHeader: e.target.checked }))}
                        />
                      }
                      label="File has header row"
                    />
                  </Box>

                  {/* CSV-specific settings */}
                  {parsingSettings.fileType === 'csv' && (
                    <>
                      <Box>
                        <FormControl fullWidth>
                          <InputLabel>Encoding</InputLabel>
                          <Select
                            value={parsingSettings.encoding || 'utf-8'}
                            onChange={(e) => setParsingSettings(prev => ({ ...prev, encoding: e.target.value }))}
                            label="Encoding"
                          >
                            {encodings.map(enc => (
                              <MenuItem key={enc.value} value={enc.value}>{enc.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      <Box>
                        <FormControl fullWidth>
                          <InputLabel>Delimiter</InputLabel>
                          <Select
                            value={parsingSettings.delimiter || ';'}
                            onChange={(e) => setParsingSettings(prev => ({ ...prev, delimiter: e.target.value }))}
                            label="Delimiter"
                          >
                            {delimiters.map(del => (
                              <MenuItem key={del.value} value={del.value}>{del.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </>
                  )}

                  {/* Date and Number Format Settings */}
                  <Box>
                    <FormControl fullWidth>
                      <InputLabel>Date Format</InputLabel>
                      <Select
                        value={parsingSettings.dateFormat}
                        onChange={(e) => setParsingSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                        label="Date Format"
                      >
                        {dateFormats.map(format => (
                          <MenuItem key={format.value} value={format.value}>{format.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box>
                    <TextField
                      fullWidth
                      label="Skip Rows"
                      type="number"
                      value={parsingSettings.skipRows || 0}
                      onChange={(e) => setParsingSettings(prev => ({ ...prev, skipRows: parseInt(e.target.value) || 0 }))}
                      helperText="Number of rows to skip before data"
                    />
                  </Box>

                  <Box>
                    <TextField
                      fullWidth
                      label="Decimal Separator"
                      value={parsingSettings.decimalSeparator}
                      onChange={(e) => setParsingSettings(prev => ({ ...prev, decimalSeparator: e.target.value }))}
                      helperText="e.g., . or ,"
                    />
                  </Box>

                  <Box>
                    <TextField
                      fullWidth
                      label="Thousands Separator"
                      value={parsingSettings.thousandsSeparator}
                      onChange={(e) => setParsingSettings(prev => ({ ...prev, thousandsSeparator: e.target.value }))}
                      helperText="e.g., space or comma"
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

                  {parsingSettings.columns.map((column, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2, alignItems: 'center' }}>
                        <Box>
                          <TextField
                            fullWidth
                            label="Column Name"
                            value={column.name}
                            onChange={(e) => updateColumn(index, 'name', e.target.value)}
                            placeholder="e.g., Дата операції"
                          />
                        </Box>

                        <Box>
                          <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                              value={column.role}
                              onChange={(e) => updateColumn(index, 'role', e.target.value)}
                              label="Role"
                            >
                              {columnRoles.map(role => (
                                <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>

                        <Box>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={column.required}
                                onChange={(e) => updateColumn(index, 'required', e.target.checked)}
                              />
                            }
                            label="Required"
                          />
                        </Box>

                        <Box>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => removeColumn(index)}
                            size="small"
                          >
                            Remove
                          </Button>
                        </Box>

                        {/* Column-specific settings */}
                        {column.role === 'date' && (
                          <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / 3' } }}>
                            <FormControl fullWidth>
                              <InputLabel>Date Format</InputLabel>
                              <Select
                                value={column.format || parsingSettings.dateFormat}
                                onChange={(e) => updateColumn(index, 'format', e.target.value)}
                                label="Date Format"
                              >
                                {dateFormats.map(format => (
                                  <MenuItem key={format.value} value={format.value}>{format.label}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                        )}

                        {(column.role === 'amount' || column.role === 'foreign_amount') && (
                          <>
                            <Box>
                              <TextField
                                fullWidth
                                label="Decimal Separator"
                                value={column.decimalSeparator || parsingSettings.decimalSeparator}
                                onChange={(e) => updateColumn(index, 'decimalSeparator', e.target.value)}
                              />
                            </Box>
                            <Box>
                              <TextField
                                fullWidth
                                label="Thousands Separator"
                                value={column.thousandsSeparator || parsingSettings.thousandsSeparator}
                                onChange={(e) => updateColumn(index, 'thousandsSeparator', e.target.value)}
                              />
                            </Box>
                          </>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <TableChart />
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
                  value={blacklist}
                  onChange={(_, value) => setBlacklist(value)}
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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {!isLoadingSettings && (
          <Button onClick={handleSave} variant="contained">
            Save Settings
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
