import { Backdrop, CircularProgress } from '@mui/material';
import { useIsFetching } from '@tanstack/react-query';

export const GlobalLoader = () => {
    const isFetching = useIsFetching();

    return (
        <Backdrop
            sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={!!isFetching}
        >
            <CircularProgress color="inherit" />
        </Backdrop>
    );
};