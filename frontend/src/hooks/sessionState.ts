import { useEffect, useState } from 'react';

export const useSessionState = <T>(key: string, initialValue: T): [T, (value: T) => void] => {
  const [sessionState, setSessionState] = useState<T>(initialValue);

  useEffect(() => {
    const storedValue = localStorage.getItem(key);
    if (storedValue !== null) {
      setSessionState(JSON.parse(storedValue));
    }
  }, [key]);

  const setValue = (value: T) => {
    setSessionState(value);
    localStorage.setItem(key, JSON.stringify(value));
  };

  return [sessionState, setValue];
};
