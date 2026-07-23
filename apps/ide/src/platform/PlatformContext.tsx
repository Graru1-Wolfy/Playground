import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createBrowserIdePlatform, type IdePlatform } from '@playground/ide-core/browser';
import { API_BASE } from '../api/client';

const PlatformContext = createContext<IdePlatform | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<IdePlatform | null>(null);

  useEffect(() => {
    let active = true;
    createBrowserIdePlatform(API_BASE).then(async (p) => {
      await p.start();
      if (active) setPlatform(p);
    });
    return () => {
      active = false;
      platform?.shutdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!platform) {
    return <div className="boot-screen">Initializing IDE platform…</div>;
  }

  return <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): IdePlatform {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('Platform not initialized');
  return ctx;
}
