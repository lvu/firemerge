import { Alert, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import { AddBox, UploadOutlined } from '@mui/icons-material';
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
    mutate: replaceStatement,
    isPending: isReplacing,
    error: replaceError,
  } = useParseStatement((data) => setStatement(data));
  const {
    mutate: addStatement,
    isPending: isAdding,
    error: addError,
  } = useParseStatement((data) => setStatement([...(statement ?? []), ...data].sort((a, b) => a.date.localeCompare(b.date))));

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    replace: boolean,
  ) => {
    if (!e.target.files?.length) return;
    if (replace) {
      replaceStatement({ file: e.target.files[0], accountId });
    } else {
      addStatement({ file: e.target.files[0], accountId });
    }
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
      {replaceError || addError ? (
        <Alert severity="error">{replaceError?.message || addError?.message}</Alert>
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
      <IconButton component="label" disabled={isReplacing} color="inherit">
        {isReplacing ? <CircularProgress size={20} /> : <UploadOutlined />}
        <input type="file" hidden onChange={(e) => handleFileChange(e, true)} ref={fileInputRef} />
      </IconButton>
      <IconButton component="label" disabled={isAdding} color="inherit">
        {isAdding ? <CircularProgress size={20} /> : <AddBox />}
        <input type="file" hidden onChange={(e) => handleFileChange(e, false)} ref={fileInputRef} />
      </IconButton>
    </Stack>
  );
}
