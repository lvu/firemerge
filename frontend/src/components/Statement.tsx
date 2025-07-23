import { Alert, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import { UploadOutlined } from '@mui/icons-material';
import { useRef } from 'react';
import { useParseStatement } from '../hooks/backend';
import type { StatementTransaction } from '../types/backend';

export default function Statement({
  statement,
  accountId,
  setStatement,
}: {
  statement: StatementTransaction[] | null;
  accountId: number;
  setStatement: (statement: StatementTransaction[]) => void;
}) {
  const {
    mutate: parseStatement,
    isPending: isUploading,
    error: uploadError,
  } = useParseStatement((data) => setStatement(data));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    parseStatement({ file: e.target.files[0], accountId });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const statementInfo =
    statement === null
      ? null
      : {
          num_transactions: statement.length,
          start_date: statement[0]?.date,
          end_date: statement[statement.length - 1]?.date,
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
            {new Date(statementInfo.start_date).toLocaleDateString()}&nbsp;&ndash;&nbsp;
            {new Date(statementInfo.end_date).toLocaleDateString()}
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
