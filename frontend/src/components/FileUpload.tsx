import { Alert, Button, Stack } from '@mui/material';
import { useUploadTransactions } from '../hooks/backend';

export default function StatementFileUpload() {
  const { mutate, isPending, error } = useUploadTransactions(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    mutate(e.target.files[0]);
  };

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Button variant="contained" component="label" disabled={isPending}>
        {isPending ? 'Uploading...' : 'Upload bank statement'}
        <input type="file" hidden onChange={handleFileChange} />
      </Button>
    </Stack>
  );
}
