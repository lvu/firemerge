import { useEffect, useState } from 'react';
import type { Account, StatementTransaction } from '../types/backend';
import { useQueryClient } from '@tanstack/react-query';

export const useSessionState = <T>(key: string, initialValue: T): [T, (value: T) => void] => {
  const [sessionState, setSessionState] = useState<T>(initialValue);

  useEffect(() => {
    const storedValue = sessionStorage.getItem(key);
    if (storedValue !== null) {
      setSessionState(JSON.parse(storedValue));
    }
  }, [key]);

  const setValue = (value: T) => {
    setSessionState(value);
    sessionStorage.setItem(key, JSON.stringify(value));
  };

  return [sessionState, setValue];
};

export const useCurrentAccount = (
  setStatement: (statement: StatementTransaction[] | null) => void,
): [Account | null, (account: Account | null) => void] => {
  const [currentAccount, setCurrentAccount] = useSessionState<Account | null>(
    'currentAccount',
    null,
  );
  const updateCurrentAccount = (account: Account | null) => {
    setCurrentAccount(account);
    setStatement(null);
  };
  return [currentAccount, updateCurrentAccount];
};

export const useStatement = (): [
  StatementTransaction[] | null,
  (data: StatementTransaction[] | null) => void,
] => {
  const [statement, setStatement] = useSessionState<StatementTransaction[] | null>(
    'statement',
    null,
  );
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['global', 'transactions'] });
  }, [queryClient, statement]);

  return [statement, setStatement];
};
