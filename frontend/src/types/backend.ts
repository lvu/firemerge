export type AccountType =
  | 'asset'
  | 'expense'
  | 'debt'
  | 'revenue'
  | 'cash'
  | 'reconciliation'
  | 'initial-balance'
  | 'liabilities';

export type Account = {
  id: number;
  name: string;
  type: AccountType;
  currency_id: number;
};

export type Category = {
  id: number;
  name: string;
};

export type Currency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
};

export type TransactionState = 'new' | 'matched' | 'annotated' | 'unmatched';
export type TransactionType =
  | 'withdrawal'
  | 'transfer-in'
  | 'transfer-out'
  | 'deposit'
  | 'reconciliation';

export type TransactionCandidate = {
  description: string;
  type: TransactionType;
  category_id?: number;
  account_id?: number;
  notes?: string;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  state: TransactionState;
  description: string;
  date: string;
  amount: number;
  currency_id: number;
  foreign_amount?: number;
  foreign_currency_id?: number;
  account_id?: number;
  account_name?: string;
  category_id?: number;
  notes?: string;
  candidates: TransactionCandidate[];
};
