import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAccounts,
  getCategories,
  getCurrencies,
  getTransactions,
  updateTransaction,
  getAccount,
  parseStatement,
  getAccountSettings,
  updateAccountSettings,
  getRepoStatementParserSettings,
} from '../services/backend';
import type {
  Account,
  AccountSettings,
  Category,
  Currency,
  RepoStatementParserSettings,
  StatementTransaction,
  Transaction,
  TransactionUpdateResponse,
} from '../types/backend';

const handleTransactionUpdateSuccess = (
  queryClient: QueryClient,
  accountId: number,
  transactions: Transaction[],
  accounts: Record<number, Account>,
  response: TransactionUpdateResponse,
  originalId: string,
) => {
  const { transaction: updated_transaction, account: updated_account } = response;
  console.log('updated_transaction', updated_transaction);
  if (transactions !== undefined) {
    queryClient.setQueryData(
      ['global', 'transactions', accountId],
      transactions?.map((t) => (t.id === originalId ? updated_transaction : t)),
    );
  }
  if (updated_account && accounts !== undefined) {
    queryClient.setQueryData(['global', 'accounts'], {
      ...accounts,
      [accountId!]: updated_account,
    });
  }
  queryClient.invalidateQueries({ queryKey: ['account_details', accountId] });
};

export const useUpdateTransaction = (
  accountId: number | undefined,
  transaction: Transaction,
  onSuccess?: () => void,
) => {
  const queryClient = useQueryClient();
  const transactions = queryClient.getQueryData<Transaction[]>([
    'global',
    'transactions',
    accountId,
  ]);
  const accounts = queryClient.getQueryData<Record<number, Account>>(['global', 'accounts']);
  return useMutation({
    mutationFn: () =>
      updateTransaction(accountId!, {
        ...transaction,
        state: transaction.state === 'enriched' ? 'new' : transaction.state,
      }),
    onSuccess: (data: TransactionUpdateResponse) => {
      handleTransactionUpdateSuccess(
        queryClient,
        accountId!,
        transactions!,
        accounts!,
        data,
        transaction.id,
      );
      onSuccess?.();
    },
  });
};

export interface ParseStatementParams {
  file: File;
  accountId: number;
}

export const useParseStatement = (onSuccess?: (data: StatementTransaction[]) => void) => {
  return useMutation({
    mutationFn: ({ file, accountId }: ParseStatementParams) =>
      parseStatement(file, accountId, Intl.DateTimeFormat().resolvedOptions().timeZone),
    onSuccess: (data: StatementTransaction[]) => {
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

export const useAccountSettings = (accountId?: number) => {
  return useQuery<AccountSettings | null>({
    queryKey: ['account_settings', accountId],
    queryFn: () => getAccountSettings(accountId!),
    enabled: !!accountId,
    staleTime: Infinity,
  });
};

export const useUpdateAccountSettings = (accountId?: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: AccountSettings) => updateAccountSettings(accountId!, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account_settings', accountId] });
    },
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
  return {
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['global'] });
      queryClient.invalidateQueries({ queryKey: ['account_details'] });
    },
  };
};

export const useAccountDetails = (accountId?: number) => {
  return useQuery<Account | null>({
    queryKey: ['account_details', accountId],
    queryFn: () => getAccount(accountId!),
    enabled: !!accountId,
    staleTime: Infinity,
  });
};

export const useRepoStatementParserSettings = () => {
  return useQuery<RepoStatementParserSettings[]>({
    queryKey: ['global', 'repo_statement_parser_settings'],
    queryFn: getRepoStatementParserSettings,
    staleTime: Infinity,
  });
};

export const useBatchUpdateTransactions = (
  accountId: number | undefined,
  transactions: Transaction[],
  onProgress?: (total: number, completed: number) => void,
  onSuccess?: () => void,
  onError?: (error: Error) => void,
) => {
  const queryClient = useQueryClient();
  const accounts = queryClient.getQueryData<Record<number, Account>>(['global', 'accounts']);
  const annotatedTransactions = transactions.filter((t) => t.state === 'annotated');
  return useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('Account ID is required');

      for (let i = 0; i < annotatedTransactions.length; i++) {
        await updateTransaction(accountId!, annotatedTransactions[i]);
        handleTransactionUpdateSuccess(
          queryClient,
          accountId!,
          transactions,
          accounts!,
          {
            transaction: annotatedTransactions[i],
            account: accounts?.[accountId!],
          },
          annotatedTransactions[i].id,
        );
        onProgress?.(annotatedTransactions.length, i + 1);
      }
    },
    onSuccess: onSuccess,
    onError: (error) => onError?.(error as Error),
  });
};
