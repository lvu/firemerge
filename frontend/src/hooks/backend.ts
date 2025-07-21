import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAccounts,
  getCategories,
  getCurrencies,
  getTransactions,
  updateTransaction,
  uploadTransactions,
} from '../services/backend';
import type { Account, Currency, Transaction, TransactionUpdateResponse } from '../types/backend';
import type { Category } from '../types/backend';

export const useUpdateTransaction = (
  accountId: number | undefined,
  transaction: Transaction,
  onSuccess?: () => void,
) => {
  const queryClient = useQueryClient();
  const { data: transactions } = useTransactions(accountId);
  const { data: accounts } = useAccounts();
  return useMutation({
    mutationFn: () =>
      updateTransaction(accountId!, {
        ...transaction,
        state: transaction.state === 'enriched' ? 'new' : transaction.state,
      }),
    onSuccess: (data: TransactionUpdateResponse) => {
      const { transaction: updated_transaction, account: updated_account } = data;
      queryClient.setQueryData(
        ['global', 'transactions', accountId],
        transactions?.map((t) => (t.id === transaction.id ? updated_transaction : t)),
      );
      if (updated_account) {
        queryClient.setQueryData(['global', 'accounts'], {
          ...accounts,
          [accountId!]: updated_account,
        });
      }
      onSuccess?.();
    },
  });
};

export const useUploadTransactions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (f: File) =>
      uploadTransactions(f, Intl.DateTimeFormat().resolvedOptions().timeZone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global', 'transactions'] });
    },
  });
};

export const useTransactions = (accountId?: number) => {
  return useQuery<Transaction[] | null>({
    queryKey: ['global', 'transactions', accountId],
    queryFn: () => getTransactions(accountId!),
    enabled: !!accountId,
    staleTime: Infinity,
  });
};

export const useAccounts = () => {
  return useQuery<Record<number, Account>>({
    queryKey: ['global', 'accounts'],
    queryFn: getAccounts,
    staleTime: Infinity,
  });
};

export const useCategories = () => {
  return useQuery<Record<number, Category>>({
    queryKey: ['global', 'categories'],
    queryFn: getCategories,
    staleTime: Infinity,
  });
};

export const useCurrencies = () => {
  return useQuery<Record<number, Currency>>({
    queryKey: ['global', 'currencies'],
    queryFn: getCurrencies,
    staleTime: Infinity,
  });
};
