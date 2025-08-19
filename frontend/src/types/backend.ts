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
  currency_id?: number;
  current_balance?: number;
};

export type ColumnMapping = {
  name: string;
  role:
    | 'date'
    | 'description'
    | 'amount'
    | 'foreign_amount'
    | 'foreign_currency'
    | 'category'
    | 'account'
    | 'notes'
    | 'ignore';
  required: boolean;
  format?: string; // For dates: "%d.%m.%Y %H:%M", "%Y-%m-%d", etc.
  decimalSeparator?: string; // For amounts: ".", ","
  thousandsSeparator?: string; // For amounts: " ", ",", ""
  currencyColumn?: string; // For foreign amounts
};

export type ParsingSettings = {
  fileType: 'pdf' | 'csv' | 'xlsx';
  encoding?: string; // For CSV files: "utf-8", "cp1251", etc.
  delimiter?: string; // For CSV files: ";", ",", "\t"
  hasHeader: boolean;
  skipRows?: number;
  dateFormat: string;
  decimalSeparator: string;
  thousandsSeparator: string;
  columns: ColumnMapping[];
  blacklist: string[];
};

export type AccountSettings = {
  blacklist: string[];
  parsingSettings?: ParsingSettings;
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

export type TransactionState = 'enriched' | 'new' | 'matched' | 'annotated' | 'unmatched';
export type TransactionType =
  | 'withdrawal'
  | 'transfer-in'
  | 'transfer-out'
  | 'deposit'
  | 'reconciliation';

export type TransactionCandidate = {
  description: string;
  date: string;
  type: TransactionType;
  category_id?: number;
  account_id?: number;
  score?: number;
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

export type StatementTransaction = {
  name: string;
  date: string;
  amount: number;
  foreign_amount?: number;
  foreign_currency_code?: string;
  notes?: string;
};

export type TransactionUpdateResponse = {
  transaction: Transaction;
  account?: Account;
};

export function enrichTransaction(
  transaction: Transaction,
  candidate: TransactionCandidate,
): Transaction {
  return {
    ...transaction,
    state: 'enriched' as TransactionState,
    type: candidate.type,
    description: candidate.description,
    account_id: candidate.account_id,
    category_id: candidate.category_id,
  };
}
