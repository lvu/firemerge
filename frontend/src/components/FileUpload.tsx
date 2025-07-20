import { CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import { UploadOutlined } from '@mui/icons-material';

export default function StatementFileUpload({ uploadTransactions, isUploading }: { uploadTransactions: (f: File) => void, isUploading: boolean }) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    uploadTransactions(e.target.files[0]);
  };

  return (
    <Stack spacing={2}>
      <Tooltip title="Upload bank statement">
        <IconButton component="label" disabled={isUploading} color="inherit">
          {isUploading ? <CircularProgress size={20} /> : <UploadOutlined />}
          <input type="file" hidden onChange={handleFileChange} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
