import type {
  Account,
  Category,
  Currency,
  Transaction,
  TransactionCandidate,
  TransactionUpdateResponse,
} from '../types/backend';

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
      message = json.message || message;
    } catch {
      // body not JSON
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

export async function getAccounts(): Promise<Record<number, Account>> {
  return (await apiFetch<Account[]>('/api/accounts'))!.reduce(
    (acc, account) => {
      acc[account.id] = account;
      return acc;
    },
    {} as Record<number, Account>,
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

export async function getTransactions(accountId: number): Promise<Transaction[] | null> {
  const data = await apiFetch<Transaction[]>(`/api/transactions`, {
    account_id: accountId.toString(),
  });
  return data;
}

export async function uploadTransactions(file: File, timezone: string): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  await apiFetch<void>(
    `/api/upload`,
    { timezone },
    {
      method: 'POST',
      body: formData,
    },
  );
}

export async function searchDescriptions(
  accountId: number,
  query: string,
): Promise<TransactionCandidate[]> {
  return (await apiFetch<TransactionCandidate[]>(`/api/descriptions`, {
    account_id: accountId.toString(),
    query,
  }))!;
}

export async function updateTransaction(
  account_id: number,
  transaction: Transaction,
): Promise<TransactionUpdateResponse> {
  return (await apiFetch<TransactionUpdateResponse>(
    `/api/transaction`,
    {
      account_id: account_id.toString(),
    },
    {
      method: 'POST',
      body: JSON.stringify(transaction),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  ))!;
}

export async function clearCache(): Promise<void> {
  await apiFetch<void>(
    '/api/clear_cache',
    {},
    {
      method: 'POST',
    },
  );
}
