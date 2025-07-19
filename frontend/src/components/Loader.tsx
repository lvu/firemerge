import { Box, CircularProgress } from '@mui/material';

export const Loader = ({ open }: { open: boolean }) => {
  if (!open) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        bgcolor: 'rgba(0, 0, 0, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <CircularProgress />
    </Box>
  );
};
