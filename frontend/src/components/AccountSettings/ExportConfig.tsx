import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { ExpandMore, FileDownload, Add } from '@mui/icons-material';
import type { ExportSettings } from '../../types/backend';
import { ExportFieldEditor } from './ExportFieldEditor';
import { transactionTypes } from './utils/settingsUtils';
import { useExportSettings } from './hooks/useExportSettings';

interface ExportConfigProps {
  exportSettings: ExportSettings | undefined;
  onUpdateExportSettings: (f: (settings: ExportSettings) => ExportSettings) => void;
  onRemoveExportSettings: () => void;
  onEnableExportSettings: () => void;
}

export const ExportConfig = ({
  exportSettings,
  onUpdateExportSettings,
  onRemoveExportSettings,
  onEnableExportSettings,
}: ExportConfigProps) => {
  const {
    addExportField,
    removeTransactionType,
    enableTransactionType,
    updateExportField,
    removeExportField,
  } = useExportSettings(onUpdateExportSettings);

  if (!exportSettings) {
    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" gap={1}>
            <FileDownload />
            <Typography variant="h6">Export Configuration</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Export Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Export settings are not configured. Enable them to configure how transaction data
              should be exported.
            </Typography>
            <Button variant="outlined" onClick={onEnableExportSettings} size="small">
              Enable Export Settings
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box display="flex" alignItems="center" gap={1}>
          <FileDownload />
          <Typography variant="h6">Export Configuration</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Export Configuration</Typography>
            <Button variant="outlined" color="error" onClick={onRemoveExportSettings} size="small">
              Remove Export Settings
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure how transaction data should be exported for different transaction types.
          </Typography>

          {transactionTypes.map((transactionType) => (
            <Accordion key={transactionType} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <FileDownload />
                  <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                    {transactionType} Export Fields
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {exportSettings[transactionType] === undefined ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Export fields for {transactionType} transactions are disabled.
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => enableTransactionType(transactionType)}
                      size="small"
                    >
                      Enable {transactionType} Export
                    </Button>
                  </Box>
                ) : (
                  <Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Typography variant="subtitle1">
                        Configure export fields for {transactionType} transactions
                      </Typography>
                      <Box display="flex" gap={1}>
                        <Button
                          variant="outlined"
                          startIcon={<Add />}
                          onClick={() => addExportField(transactionType)}
                          size="small"
                        >
                          Add Field
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => removeTransactionType(transactionType)}
                          size="small"
                        >
                          Disable
                        </Button>
                      </Box>
                    </Box>

                    {exportSettings[transactionType]?.map((field, index) => (
                      <ExportFieldEditor
                        key={index}
                        field={field}
                        index={index}
                        transactionType={transactionType}
                        onUpdate={updateExportField}
                        onRemove={removeExportField}
                      />
                    ))}

                    {(!exportSettings[transactionType] ||
                      exportSettings[transactionType].length === 0) && (
                      <Box
                        sx={{
                          p: 3,
                          textAlign: 'center',
                          border: '1px dashed',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          No export fields configured. Click "Add Field" to get started.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};
