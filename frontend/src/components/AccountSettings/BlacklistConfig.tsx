import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  TextField,
  Autocomplete,
  Chip,
} from '@mui/material';
import { ExpandMore, Block } from '@mui/icons-material';
import type { AccountSettings } from '../../types/backend';

interface BlacklistConfigProps {
  settings: AccountSettings;
  onUpdate: (blacklist: string[]) => void;
}

export const BlacklistConfig = ({ settings, onUpdate }: BlacklistConfigProps) => {
  return (
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
          onChange={(_, value) => onUpdate(value)}
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
  );
};
