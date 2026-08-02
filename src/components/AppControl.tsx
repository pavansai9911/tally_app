import { createContext, useContext } from 'react';

/** App-level controls exposed to deep screens (e.g. Settings' Hard Reset needs to re-bootstrap). */
export interface AppControl {
  /** Tear down and re-run the launch flow — used after a hard reset to return to a fresh state. */
  restart: () => void;
}

const AppControlContext = createContext<AppControl>({ restart: () => {} });

export const AppControlProvider = AppControlContext.Provider;
export const useAppControl = () => useContext(AppControlContext);
