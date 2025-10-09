import type { StatementParserSettings, StatementFormat, ColumnInfo } from '../../../types/backend';
import { defaultCSVSettings } from '../utils/settingsUtils';

export const useParserSettings = (
  updateParserSettings: (f: (settings: StatementParserSettings) => StatementParserSettings) => void,
) => {
  const updateColumn = (index: number, field: keyof ColumnInfo, value: string | undefined) => {
    updateParserSettings((prev) => ({
      ...prev,
      columns: prev.columns.map((col, i) => (i === index ? { ...col, [field]: value } : col)),
    }));
  };

  const addColumn = () => {
    updateParserSettings((prev) => ({
      ...prev,
      columns: [
        ...(prev.columns || []),
        {
          name: '',
        },
      ],
    }));
  };

  const removeColumn = (index: number) => {
    updateParserSettings((prev) => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index),
    }));
  };

  const updateSeparator = (value: string) => {
    updateParserSettings((prev) => {
      return {
        ...prev,
        format: { ...prev.format, separator: value },
      };
    });
  };

  const updateEncoding = (value: string) => {
    updateParserSettings((prev) => ({
      ...prev,
      format: { ...prev.format, encoding: value },
    }));
  };

  const updateFormat = (format: StatementFormat) => {
    updateParserSettings((prev) => ({
      ...prev,
      format: format === 'csv' ? defaultCSVSettings : { format: format },
    }));
  };

  const updateDateFormat = (value: string) => {
    updateParserSettings((prev) => ({
      ...prev,
      date_format: value,
    }));
  };

  const updateDecimalSeparator = (value: string) => {
    updateParserSettings((prev) => ({
      ...prev,
      decimal_separator: value || undefined,
    }));
  };

  return {
    updateColumn,
    addColumn,
    removeColumn,
    updateSeparator,
    updateEncoding,
    updateFormat,
    updateDateFormat,
    updateDecimalSeparator,
  };
};
