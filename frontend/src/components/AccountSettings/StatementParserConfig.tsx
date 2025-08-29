import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
} from '@mui/material';
import { ExpandMore, Input } from '@mui/icons-material';
import type { StatementParserSettings, StatementFormat, StatementFormatSettingsCSV } from '../../types/backend';
import { columnRoles, dateFormats, encodings, separators } from './utils/settingsUtils';
import { useParserSettings } from './hooks/useParserSettings';

interface StatementParserConfigProps {
  parserSettings: StatementParserSettings | undefined;
  configs: any[] | undefined;
  selectedConfig: string;
  isLoadingConfigs: boolean;
  onUpdateParserSettings: (f: (settings: StatementParserSettings) => StatementParserSettings) => void;
  onConfigSelect: (configLabel: string) => void;
}

export const StatementParserConfig = ({
  parserSettings,
  configs,
  selectedConfig,
  isLoadingConfigs,
  onUpdateParserSettings,
  onConfigSelect,
}: StatementParserConfigProps) => {
  const {
    updateColumn,
    addColumn,
    removeColumn,
    updateSeparator,
    updateEncoding,
    updateFormat,
    updateDateFormat,
    updateDecimalSeparator,
  } = useParserSettings(onUpdateParserSettings);

  if (!parserSettings) {
    return null;
  }

  return (
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
              onChange={(e) => onConfigSelect(e.target.value)}
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
                value={parserSettings.format.format}
                onChange={(e) => updateFormat(e.target.value as StatementFormat)}
                label="Format"
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="xlsx">Excel (XLSX)</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
              </Select>
            </FormControl>

            {parserSettings.format.format === 'csv' && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Encoding</InputLabel>
                  <Select
                    value={(parserSettings.format as StatementFormatSettingsCSV).encoding || 'utf-8'}
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
                    value={(parserSettings.format as StatementFormatSettingsCSV).separator || ','}
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
                value={parserSettings.date_format}
                onChange={(e) => updateDateFormat(e.target.value)}
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
              value={parserSettings.decimal_separator || ''}
              onChange={(e) => updateDecimalSeparator(e.target.value)}
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

          {parserSettings.columns?.map((column, index) => (
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
  );
};
