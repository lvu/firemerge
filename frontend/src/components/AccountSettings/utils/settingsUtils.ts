import type { StatementParserSettings, StatementFormatSettingsCSV, AccountSettings } from '../../../types/backend';
import type { ColumnRoleOption, DateFormatOption, EncodingOption, SeparatorOption, ExportFieldTypeOption } from '../types/settingsTypes';

// Default parser settings
export const defaultCSVSettings: StatementFormatSettingsCSV = {
  format: 'csv',
  separator: ',',
  encoding: 'utf-8',
};

export const defaultParserSettings: StatementParserSettings = {
  columns: [],
  format: defaultCSVSettings,
  decimal_separator: '.',
  date_format: '%d.%m.%Y %H:%M',
};

export const defaultSettings: AccountSettings = {
  blacklist: [],
  parser_settings: defaultParserSettings,
};

// Column role options
export const columnRoles: ColumnRoleOption[] = [
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name/Description' },
  { value: 'iban', label: 'IBAN' },
  { value: 'currency_code', label: 'Currency Code' },
  { value: 'amount', label: 'Amount' },
  { value: 'amount_debit', label: 'Amount Debit' },
  { value: 'amount_credit', label: 'Amount Credit' },
  { value: 'foreign_currency_code', label: 'Foreign Currency Code' },
  { value: 'foreign_amount', label: 'Foreign Amount' },
  { value: 'doc_number', label: 'Document Number' },
];

// Date format options
export const dateFormats: DateFormatOption[] = [
  { value: '%d.%m.%Y', label: 'DD.MM.YYYY' },
  { value: '%d.%m.%Y %H:%M', label: 'DD.MM.YYYY HH:MM' },
  { value: '%d.%m.%Y %H:%M:%S', label: 'DD.MM.YYYY HH:MM:SS' },
  { value: '%Y-%m-%d', label: 'YYYY-MM-DD' },
  { value: '%Y-%m-%d %H:%M', label: 'YYYY-MM-DD HH:MM' },
  { value: '%m/%d/%Y', label: 'MM/DD/YYYY' },
  { value: '%d/%m/%Y', label: 'DD/MM/YYYY' },
];

// Encoding options
export const encodings: EncodingOption[] = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'cp1251', label: 'Windows-1251' },
  { value: 'iso-8859-1', label: 'ISO-8859-1' },
  { value: 'latin1', label: 'Latin-1' },
];

// Separator options
export const separators: SeparatorOption[] = [
  { value: ';', label: 'Semicolon (;)' },
  { value: ',', label: 'Comma (,)' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe (|)' },
];

// Export field type options
export const exportFieldTypes: ExportFieldTypeOption[] = [
  { value: 'date', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'currency_code', label: 'Currency Code' },
  { value: 'foreign_amount', label: 'Foreign Amount' },
  { value: 'foreign_currency_code', label: 'Foreign Currency Code' },
  { value: 'source_account_name', label: 'Source Account Name' },
  { value: 'destination_account_name', label: 'Destination Account Name' },
  { value: 'empty', label: 'Empty' },
  { value: 'constant', label: 'Constant' },
  { value: 'exchange_rate', label: 'Exchange Rate' },
];

// Transaction types
export const transactionTypes = ['deposit', 'withdrawal', 'transfer'] as const;

// Helper functions
export const createEmptyExportSettings = () => ({
  deposit: [],
  withdrawal: [],
  transfer: [],
});

export const isExportFieldDate = (field: any): field is { type: 'date'; format: string } => {
  return field.type === 'date';
};

export const isExportFieldConstant = (field: any): field is { type: 'constant'; value: string } => {
  return field.type === 'constant';
};
