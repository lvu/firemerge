import { Backdrop, CircularProgress } from '@mui/material';

export const Loader = ({ open }: { open: boolean }) => {
  return (
    <Backdrop open={open} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <CircularProgress />
    </Backdrop>
  );
};
