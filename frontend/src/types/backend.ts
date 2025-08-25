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

export type StatementFormat = 'csv' | 'xlsx' | 'pdf';

export type StatementFormatSettingsCSV = {
  format: 'csv';
  separator: string;
  encoding: string;
};

export type StatementFormatSettingsXLSX = {
  format: 'xlsx';
};

export type StatementFormatSettingsPDF = {
  format: 'pdf';
};

export type StatementFormatSettings =
  | StatementFormatSettingsCSV
  | StatementFormatSettingsXLSX
  | StatementFormatSettingsPDF;

export type ColumnRole =
  | 'date'
  | 'name'
  | 'iban'
  | 'currency_code'
  | 'amount'
  | 'amount_debit'
  | 'amount_credit'
  | 'foreign_currency_code'
  | 'foreign_amount'
  | 'doc_number';

export type ColumnInfo = {
  name: string;
  notes_label?: string;
  role?: ColumnRole;
};

export type StatementParserSettings = {
  columns: ColumnInfo[];
  format: StatementFormatSettings;
  date_format: string;
  decimal_separator?: string;
};

export type AccountSettings = {
  blacklist: string[];
  parser_settings?: StatementParserSettings;
};

export type RepoStatementParserSettings = StatementParserSettings & {
  label: string;
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
