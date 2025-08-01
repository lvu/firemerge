import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAccounts,
  getCategories,
  getCurrencies,
  getTransactions,
  updateTransaction,
  clearCache,
  getAccount,
  parseStatement,
} from '../services/backend';
import type {
  Account,
  Category,
  Currency,
  StatementTransaction,
  Transaction,
  TransactionUpdateResponse,
} from '../types/backend';

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
      queryClient.invalidateQueries({ queryKey: ['account_details', accountId] });
      onSuccess?.();
    },
  });
};

export interface ParseStatementParams {
  file: File;
  accountId: number;
}

export const useParseStatement = (onSuccess?: (data: StatementTransaction[]) => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, accountId }: ParseStatementParams) =>
      parseStatement(file, accountId, Intl.DateTimeFormat().resolvedOptions().timeZone),
    onSuccess: (data: StatementTransaction[]) => {
      queryClient.invalidateQueries({ queryKey: ['global', 'transactions'] });
      onSuccess?.(data);
    },
  });
};

export const useTransactions = (accountId?: number, statement?: StatementTransaction[]) => {
  return useQuery<Transaction[] | null>({
    queryKey: ['global', 'transactions', accountId],
    queryFn: () => getTransactions(accountId!, statement!),
    enabled: !!accountId && !!statement,
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

export const useRefresh = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearCache,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global'] });
      queryClient.invalidateQueries({ queryKey: ['account_details'] });
    },
  });
};

export const useAccountDetails = (accountId?: number) => {
  return useQuery<Account | null>({
    queryKey: ['account_details', accountId],
    queryFn: () => getAccount(accountId!),
    enabled: !!accountId,
    staleTime: Infinity,
  });
};
