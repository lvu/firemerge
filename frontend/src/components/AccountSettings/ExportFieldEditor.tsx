import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import type { ExportField, ExportSettings } from '../../types/backend';
import { exportFieldTypes, dateFormats } from './utils/settingsUtils';

interface ExportFieldEditorProps {
  field: ExportField;
  index: number;
  transactionType: keyof ExportSettings;
  onUpdate: (transactionType: keyof ExportSettings, index: number, field: string, value: string) => void;
  onRemove: (transactionType: keyof ExportSettings, index: number) => void;
}

export const ExportFieldEditor = ({
  field,
  index,
  transactionType,
  onUpdate,
  onRemove,
}: ExportFieldEditorProps) => {
  return (
    <Box
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
          label="Field Label"
          value={field.label}
          onChange={(e) => onUpdate(transactionType, index, 'label', e.target.value)}
          placeholder="e.g., Transaction Date"
        />

        <FormControl fullWidth>
          <InputLabel>Field Type</InputLabel>
          <Select
            value={field.type}
            onChange={(e) => onUpdate(transactionType, index, 'type', e.target.value)}
            label="Field Type"
          >
            {exportFieldTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {field.type === 'date' && (
          <FormControl fullWidth>
            <InputLabel>Date Format</InputLabel>
            <Select
              value={(field as any).format || '%d.%m.%Y'}
              onChange={(e) => onUpdate(transactionType, index, 'format', e.target.value)}
              label="Date Format"
            >
              {dateFormats.map((format) => (
                <MenuItem key={format.value} value={format.value}>
                  {format.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {field.type === 'constant' && (
          <TextField
            fullWidth
            label="Constant Value"
            value={(field as any).value || ''}
            onChange={(e) => onUpdate(transactionType, index, 'value', e.target.value)}
            placeholder="e.g., USD"
          />
        )}

        <IconButton
          color="error"
          onClick={() => onRemove(transactionType, index)}
          size="small"
        >
          <Delete />
        </IconButton>
      </Box>
    </Box>
  );
};
