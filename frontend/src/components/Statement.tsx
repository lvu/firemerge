import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { UploadOutlined } from '@mui/icons-material';
import { useParseStatement } from '../hooks/backend';
import type { StatementTransaction } from '../types/backend';
import { useDropzone } from 'react-dropzone';
import { Loader } from './Loader';

export function StatementUpload({
  statement,
  accountId,
  setStatement,
  replace,
  onClose,
}: {
  statement: StatementTransaction[] | null;
  accountId: number;
  setStatement: (statement: StatementTransaction[] | null) => void;
  replace: boolean;
  onClose?: () => void;
}) {
  const {
    mutate: processStatement,
    isPending: isProcessing,
    error: processingError,
  } = useParseStatement((data) => {
    if (replace) {
      setStatement(data);
    } else {
      setStatement([...(statement ?? []), ...data].sort((a, b) => a.date.localeCompare(b.date)));
    }
    onClose?.();
  });

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      for (const file of acceptedFiles) {
        processStatement({ file, accountId });
      }
    },
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: '2px dashed',
        borderColor: 'primary.main',
        borderRadius: 2,
        p: 4,
        textAlign: 'center',
        cursor: 'pointer',
      }}
    >
      <Loader open={isProcessing} />
      <input {...getInputProps()} />
      <UploadOutlined sx={{ fontSize: 40, mb: 1 }} />
      <Typography variant="h6">Upload statement</Typography>
      <Typography variant="body2" color="text.secondary">
        or click to select
      </Typography>
      {processingError && <Alert severity="error">{processingError.message}</Alert>}
    </Box>
  );
}

export function StatementUploadDialog({
  open,
  onClose,
  statement,
  accountId,
  setStatement,
}: {
  open: boolean;
  onClose: () => void;
  statement: StatementTransaction[] | null;
  accountId: number;
  setStatement: (statement: StatementTransaction[] | null) => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-hidden={!open}
    >
      <DialogTitle>Upload additional statement</DialogTitle>
      <DialogContent>
        <StatementUpload
          statement={statement}
          accountId={accountId}
          setStatement={setStatement}
          replace={false}
          onClose={onClose}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
