import { CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import { UploadOutlined } from '@mui/icons-material';
import { useRef } from 'react';

export default function StatementFileUpload({
  uploadTransactions,
  isUploading,
}: {
  uploadTransactions: (f: File) => void;
  isUploading: boolean;
}) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await uploadTransactions(e.target.files[0]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
      <Tooltip title="Upload bank statement">
        <IconButton component="label" disabled={isUploading} color="inherit">
          {isUploading ? <CircularProgress size={20} /> : <UploadOutlined />}
          <input type="file" hidden onChange={handleFileChange} ref={fileInputRef} />
        </IconButton>
      </Tooltip>
  );
}
