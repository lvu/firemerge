import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Main } from './components/Main';
import { GlobalLoader } from './components/GlobalLoader';
import { Box } from '@mui/material';

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Box>
        <Main />
        <GlobalLoader />
      </Box>
    </QueryClientProvider>
  );
}

export default App;
