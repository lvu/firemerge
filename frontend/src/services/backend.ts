import type { Account, Category, Currency, Transaction } from "../types/backend";

async function apiFetch<T>(
    input: RequestInfo,
    queryParams?: Record<string, string>,
    init?: RequestInit
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
        } catch (_) {
            // body not JSON
        }
        throw new Error(message);
    }

    if (res.status === 204) {
        return null;
    }

    return res.json();
}

export function getAccounts(): Promise<Account[]> {
    return apiFetch<Account[]>('/api/accounts')!;
}

export function getCategories(): Promise<Category[]> {
    return apiFetch<Category[]>('/api/categories')!;
}

export function getCurrencies(): Promise<Currency[]> {
    return apiFetch<Currency[]>('/api/currencies')!;
}

export function getTransactions(accountId: number): Promise<Transaction[] | null> {
    return apiFetch<Transaction[]>(`/api/transactions`, { account_id: accountId.toString() });
}

export function uploadTransactions(file: File, timezone: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    apiFetch<void>(`/api/upload`, { timezone }, {
        method: 'POST',
        body: formData,
    });
}