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
  export_settings?: ExportSettings;
};

export type ExportFieldType =
  | 'date'
  | 'amount'
  | 'currency_code'
  | 'foreign_amount'
  | 'foreign_currency_code'
  | 'source_account_name'
  | 'destination_account_name'
  | 'empty'
  | 'constant'
  | 'exchange_rate';

export type DateExportField = {
  label: string;
  type: 'date';
  format: string;
};

export type ConstantExportField = {
  label: string;
  type: 'constant';
  value: string;
};

export type OtherExportField = {
  label: string;
  type:
    | 'amount'
    | 'currency_code'
    | 'foreign_amount'
    | 'foreign_currency_code'
    | 'source_account_name'
    | 'destination_account_name'
    | 'empty'
    | 'exchange_rate';
};

export type ExportField = DateExportField | ConstantExportField | OtherExportField;

export function isDateExportField(field: ExportField): field is DateExportField {
  return field.type === 'date';
}

export function isConstantExportField(field: ExportField): field is ConstantExportField {
  return field.type === 'constant';
}

export function isOtherExportField(field: ExportField): field is OtherExportField {
  return field.type !== 'date' && field.type !== 'constant';
}

export type ExportSettings = {
  deposit?: ExportField[];
  withdrawal?: ExportField[];
  transfer?: ExportField[];
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

export type PydanticErrorResponse = {
  detail: {
    msg: string;
    loc: string[];
    type: string;
  }[];
};
