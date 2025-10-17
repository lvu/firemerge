import type {
  Account,
  Category,
  Currency,
  Transaction,
  TransactionCandidate,
  TransactionUpdateResponse,
  StatementTransaction,
  AccountSettings,
  RepoStatementParserSettings,
  StatementFormatSettings,
  StatementParserSettings,
} from '../types/backend';
import { PydanticError } from '../types/errors';

async function apiFetch<T>(
  input: RequestInfo,
  queryParams?: Record<string, string>,
  init?: RequestInit,
): Promise<T | null> {
  if (queryParams) {
    input += '?' + new URLSearchParams(queryParams).toString();
  }
  const res = await fetch(input, init);

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const json = await res.json();
      if (Array.isArray(json.detail)) {
        throw new PydanticError(json);
      }
      message = json.message || json.detail || message;
    } catch (e) {
      if (e instanceof PydanticError) {
        throw e;
      }
      console.error(e);
      // body not JSON
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

export async function getAccount(accountId: number): Promise<Account | null> {
  return (await apiFetch<Account>(`/api/accounts/${accountId}`))!;
}

export async function getAccounts(): Promise<Record<number, Account>> {
  return (await apiFetch<Account[]>('/api/accounts/'))!.reduce(
    (acc, account) => {
      acc[account.id] = account;
      return acc;
    },
    {} as Record<number, Account>,
  );
}

export async function getAccountSettings(accountId: number): Promise<AccountSettings> {
  return (await apiFetch<AccountSettings>(`/api/accounts/${accountId}/settings`))!;
}

export async function updateAccountSettings(
  accountId: number,
  settings: AccountSettings,
): Promise<void> {
  await apiFetch<void>(
    `/api/accounts/${accountId}/settings`,
    {},
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    },
  );
}

export async function getCategories(): Promise<Record<number, Category>> {
  return (await apiFetch<Category[]>('/api/categories'))!.reduce(
    (acc, category) => {
      acc[category.id] = category;
      return acc;
    },
    {} as Record<number, Category>,
  );
}

export async function getCurrencies(): Promise<Record<number, Currency>> {
  return (await apiFetch<Currency[]>('/api/currencies'))!.reduce(
    (acc, currency) => {
      acc[currency.id] = currency;
      return acc;
    },
    {} as Record<number, Currency>,
  );
}

export async function getTransactions(
  accountId: number,
  statement: StatementTransaction[],
): Promise<Transaction[] | null> {
  const data = await apiFetch<Transaction[]>(
    `/api/transactions/`,
    {
      account_id: accountId.toString(),
    },
    {
      method: 'POST',
      body: JSON.stringify(statement),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  return data;
}

export async function parseStatement(
  file: File,
  accountId: number,
  timezone: string,
): Promise<StatementTransaction[]> {
  const formData = new FormData();
  formData.append('file', file);
  return (await apiFetch<StatementTransaction[]>(
    `/api/statement/parse`,
    { timezone, account_id: accountId.toString() },
    {
      method: 'POST',
      body: formData,
    },
  ))!;
}

export async function searchDescriptions(
  accountId: number,
  query: string,
): Promise<TransactionCandidate[]> {
  return (await apiFetch<TransactionCandidate[]>(`/api/transactions/descriptions`, {
    account_id: accountId.toString(),
    query,
  }))!;
}

export async function updateTransaction(
  account_id: number,
  transaction: Transaction,
): Promise<TransactionUpdateResponse> {
  return (await apiFetch<TransactionUpdateResponse>(
    `/api/transactions/`,
    {
      account_id: account_id.toString(),
    },
    {
      method: 'PUT',
      body: JSON.stringify(transaction),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  ))!;
}

export async function guessStatementParserSettings(
  file: File,
  formatSettings: StatementFormatSettings,
): Promise<StatementParserSettings> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('format_settings', JSON.stringify(formatSettings));
  return (await apiFetch<StatementParserSettings>(`/api/statement/guess-config`, undefined, {
    method: 'POST',
    body: formData,
  }))!;
}

export async function getRepoStatementParserSettings(): Promise<RepoStatementParserSettings[]> {
  return (await apiFetch<RepoStatementParserSettings[]>('/api/statement/configs'))!;
}
