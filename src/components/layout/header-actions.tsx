'use client';

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react';

export type ParsedEnvSecrets = Record<string, string>;
export type ExportSecretsMap = Record<string, string>;

export interface HeaderActionConfig {
  onImportEnv?: (
    secrets: ParsedEnvSecrets,
    fileName: string
  ) => Promise<number> | number;
  getExportSecrets?: () => Promise<ExportSecretsMap> | ExportSecretsMap;
  onAddSecret?: () => void;
}

interface HeaderActionsContextValue {
  actions: HeaderActionConfig | null;
  setActions: (actions: HeaderActionConfig | null) => void;
}

const HeaderActionsContext = createContext<HeaderActionsContextValue | undefined>(
  undefined
);

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<HeaderActionConfig | null>(null);

  const setActions = useCallback((nextActions: HeaderActionConfig | null) => {
    setActionsState(nextActions);
  }, []);

  const value = useMemo(
    () => ({
      actions,
      setActions,
    }),
    [actions, setActions]
  );

  return (
    <HeaderActionsContext.Provider value={value}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

export function useHeaderActions() {
  const context = useContext(HeaderActionsContext);
  if (!context) {
    throw new Error('useHeaderActions must be used within HeaderActionsProvider');
  }
  return context;
}
