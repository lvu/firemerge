import { Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useRefresh } from '../hooks/backend';

export const RefreshButton = () => {
  const { mutate: refresh } = useRefresh();
  return (
    <Button variant="text" color="inherit" onClick={() => refresh()}>
      <Refresh />
    </Button>
  );
};
