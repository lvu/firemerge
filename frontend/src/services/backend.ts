import type {
  Account,
  Category,
  Currency,
  Transaction,
  TransactionCandidate,
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

export async function getAccounts(): Promise<Account[]> {
  return (await apiFetch<Account[]>('/api/accounts'))!;
}

export async function getCategories(): Promise<Category[]> {
  return (await apiFetch<Category[]>('/api/categories'))!;
}

export async function getCurrencies(): Promise<Currency[]> {
  return (await apiFetch<Currency[]>('/api/currencies'))!;
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
): Promise<void> {
  await apiFetch<void>(`/api/transaction`, undefined, {
    method: 'POST',
    body: JSON.stringify({ account_id, transaction }),
  });
}
