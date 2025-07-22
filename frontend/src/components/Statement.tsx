import { Alert, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import { UploadOutlined } from '@mui/icons-material';
import { useRef } from 'react';
import { useStatementInfo } from '../hooks/backend';
import { useUploadTransactions } from '../hooks/backend';

export default function StatementFileUpload() {
  const {
    mutate: uploadTransactions,
    isPending: isUploading,
    error: uploadError,
  } = useUploadTransactions();
  const { data: statementInfo } = useStatementInfo();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await uploadTransactions(e.target.files[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      {uploadError ? (
        <Alert severity="error">{uploadError.message}</Alert>
      ) : statementInfo ? (
        <>
          <Typography>{statementInfo.num_transactions} transactions</Typography>
          <Typography>
            {statementInfo.start_date}&nbsp;&ndash;&nbsp;{statementInfo.end_date}
          </Typography>
        </>
      ) : (
        <Typography>No statement uploaded</Typography>
      )}
      <IconButton component="label" disabled={isUploading} color="inherit">
        {isUploading ? <CircularProgress size={20} /> : <UploadOutlined />}
        <input type="file" hidden onChange={handleFileChange} ref={fileInputRef} />
      </IconButton>
    </Stack>
  );
}
