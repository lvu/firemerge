import type { ExportSettings } from '../../../types/backend';

export const useExportSettings = (
  updateExportSettings: (f: (settings: ExportSettings) => ExportSettings) => void,
) => {
  const addExportField = (transactionType: keyof ExportSettings) => {
    updateExportSettings((prev) => ({
      ...prev,
      [transactionType]: [...(prev[transactionType] || []), { label: 'New Field', type: 'empty' }],
    }));
  };

  const removeTransactionType = (transactionType: keyof ExportSettings) => {
    updateExportSettings((prev) => ({
      ...prev,
      [transactionType]: undefined,
    }));
  };

  const enableTransactionType = (transactionType: keyof ExportSettings) => {
    updateExportSettings((prev) => ({
      ...prev,
      [transactionType]: [],
    }));
  };

  const updateExportField = (
    transactionType: keyof ExportSettings,
    index: number,
    field: string,
    value: string,
  ) => {
    updateExportSettings((prev) => ({
      ...prev,
      [transactionType]: (prev[transactionType] || []).map((fieldItem, i) =>
        i === index ? { ...fieldItem, [field]: value } : fieldItem,
      ),
    }));
  };

  const removeExportField = (transactionType: keyof ExportSettings, index: number) => {
    updateExportSettings((prev) => ({
      ...prev,
      [transactionType]: (prev[transactionType] || []).filter((_, i) => i !== index),
    }));
  };

  return {
    addExportField,
    removeTransactionType,
    enableTransactionType,
    updateExportField,
    removeExportField,
  };
};
