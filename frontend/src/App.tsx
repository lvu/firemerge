import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Main } from './components/Main';
import { GlobalLoader } from './components/GlobalLoader';
import { Box, createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

function App() {
  const queryClient = new QueryClient();
  const colorTheme = createTheme({
    colorSchemes: {
      dark: true,
    },
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={colorTheme}>
          <CssBaseline/>
          <Box>
            <Main />
            <GlobalLoader />
          </Box>
        </ThemeProvider>
      </QueryClientProvider>
    </LocalizationProvider>
  );
}

export default App;
