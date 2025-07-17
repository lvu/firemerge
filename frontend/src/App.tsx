import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Main } from './components/Main';
import { GlobalLoader } from './components/GlobalLoader';

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalLoader />
      <Main />
    </QueryClientProvider>
  )
}

export default App
