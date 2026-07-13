/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface NativeRankedSetupLoadResult {
  ok: boolean;
  data?: number[];
  missing?: boolean;
  error?: string;
}

interface NativeRankedSetupGenerateResult {
  ok: boolean;
  heightRange?: string;
  dataRoot?: string;
  log?: string;
  error?: string;
  attempts?: unknown[];
}

interface Window {
  bounceNative?: {
    canGenerateRankedSetups: boolean;
    generateRankedSetups(heightRange: string): Promise<NativeRankedSetupGenerateResult>;
    loadGeneratedSetup(height: number): Promise<NativeRankedSetupLoadResult>;
  };
}
