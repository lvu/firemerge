import { useIsFetching } from '@tanstack/react-query';
import { Loader } from './Loader';

export const GlobalLoader = () => {
  const isFetching = useIsFetching({ queryKey: ['global'] });

  return <Loader open={!!isFetching} />;
};
