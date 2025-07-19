import { useIsFetching } from '@tanstack/react-query';
import { Backdrop, CircularProgress } from '@mui/material';

export const GlobalLoader = () => {
  const isFetching = useIsFetching({ queryKey: ['global'] });

  return (
    <Backdrop open={!!isFetching}>
      <CircularProgress />
    </Backdrop>
  );
};
