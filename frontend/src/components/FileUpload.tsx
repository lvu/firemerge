import { Alert, Button, Stack } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadTransactions } from '../services/backend';

export default function StatementFileUpload() {
  const queryClient = useQueryClient();
  const { mutate, isPending, error } = useMutation({
    mutationFn: (file: File) =>
      uploadTransactions(file, Intl.DateTimeFormat().resolvedOptions().timeZone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

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
