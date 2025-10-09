import { Alert, Typography } from '@mui/material';
import { PydanticError } from '../types/errors';

export const ErrorDisplay = ({
  message,
  error,
  visible,
  ref,
}: {
  message: string;
  error: Error | null;
  visible: boolean;
  ref: React.RefObject<HTMLDivElement | null> | null;
}) => {
  return (
    <Alert severity="error" ref={ref} sx={{ display: visible ? 'block' : 'none' }}>
      <Typography variant="body1">{message}</Typography>
      {error instanceof PydanticError ? (
        error.data.detail.map((element, index) => (
          <Typography variant="body2" key={index}>
            {element.msg}
          </Typography>
        ))
      ) : (
        <Typography variant="body2">{error?.message}</Typography>
      )}
    </Alert>
  );
};
