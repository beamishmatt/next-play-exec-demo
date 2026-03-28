import React, { createContext, useContext, useState } from 'react';

interface ActionBarContextType {
  isActionBarVisible: boolean;
  setActionBarVisible: (visible: boolean) => void;
}

const ActionBarContext = createContext<ActionBarContextType | undefined>(undefined);

export function useActionBar() {
  const context = useContext(ActionBarContext);
  if (!context) {
    throw new Error('useActionBar must be used within an ActionBarProvider');
  }
  return context;
}

interface ActionBarProviderProps {
  children: React.ReactNode;
}

export function ActionBarProvider({ children }: ActionBarProviderProps) {
  const [isActionBarVisible, setActionBarVisible] = useState(false);

  return (
    <ActionBarContext.Provider value={{ isActionBarVisible, setActionBarVisible }}>
      {children}
    </ActionBarContext.Provider>
  );
}