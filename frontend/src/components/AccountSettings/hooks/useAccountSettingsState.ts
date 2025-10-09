import { useState, useEffect } from 'react';
import type {
  AccountSettings,
  StatementParserSettings,
  ExportSettings,
} from '../../../types/backend';
import {
  defaultSettings,
  defaultParserSettings,
  createEmptyExportSettings,
} from '../utils/settingsUtils';

export const useAccountSettingsState = (initialSettings: AccountSettings | null) => {
  const [settings, setSettings] = useState<AccountSettings>(defaultSettings);
  const [jsonError, setJsonError] = useState<string>('');

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        ...initialSettings,
        parser_settings: initialSettings.parser_settings || defaultParserSettings,
        export_settings: initialSettings.export_settings,
      });
    }
  }, [initialSettings]);

  const updateSettings = (f: (settings: AccountSettings) => AccountSettings) => {
    setSettings(f);
  };

  const updateParserSettings = (
    f: (settings: StatementParserSettings) => StatementParserSettings,
  ) => {
    setSettings((prev) => ({
      ...prev,
      parser_settings: f(prev.parser_settings || defaultParserSettings),
    }));
  };

  const updateExportSettings = (f: (settings: ExportSettings) => ExportSettings) => {
    setSettings((prev) => ({
      ...prev,
      export_settings: f(prev.export_settings || createEmptyExportSettings()),
    }));
  };

  const removeExportSettings = () => {
    setSettings((prev) => ({
      ...prev,
      export_settings: undefined,
    }));
  };

  const enableExportSettings = () => {
    setSettings((prev) => ({
      ...prev,
      export_settings: createEmptyExportSettings(),
    }));
  };

  const handleJsonChange = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      setSettings(parsed);
      setJsonError('');
    } catch (error) {
      setJsonError(
        `Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const resetToInitial = () => {
    if (initialSettings) {
      setSettings({
        ...initialSettings,
        parser_settings: initialSettings.parser_settings || defaultParserSettings,
        export_settings: initialSettings.export_settings,
      });
    } else {
      setSettings(defaultSettings);
    }
  };

  return {
    settings,
    jsonError,
    updateSettings,
    updateParserSettings,
    updateExportSettings,
    removeExportSettings,
    enableExportSettings,
    handleJsonChange,
    resetToInitial,
  };
};
