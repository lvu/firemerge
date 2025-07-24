import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Main } from './components/Main';
import { GlobalLoader } from './components/GlobalLoader';
import { Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

function App() {
  const queryClient = new QueryClient();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <QueryClientProvider client={queryClient}>
        <Box>
          <Main />
          <GlobalLoader />
        </Box>
      </QueryClientProvider>
    </LocalizationProvider>
  );
}

export default App;
