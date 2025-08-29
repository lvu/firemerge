import type { AccountSettings, StatementParserSettings, ExportSettings, ExportField, ExportFieldType } from '../../../types/backend';

export type { AccountSettings, StatementParserSettings, ExportSettings, ExportField, ExportFieldType };

export interface ColumnRoleOption {
  value: string;
  label: string;
}

export interface DateFormatOption {
  value: string;
  label: string;
}

export interface EncodingOption {
  value: string;
  label: string;
}

export interface SeparatorOption {
  value: string;
  label: string;
}

export interface ExportFieldTypeOption {
  value: ExportFieldType;
  label: string;
}

export interface SettingsUpdateFunction<T> {
  (settings: T): T;
}

export interface FieldUpdateFunction {
  (index: number, field: string, value: string): void;
}

export interface TransactionTypeKey {
  (key: keyof ExportSettings): void;
}
