/// <reference types="vite/client" />
/// <reference types="vitest" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  __TAURI__?: {
    invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    convertFileSrc: (filePath: string, protocol?: string) => string;
    transformCallback: (callback?: (response: unknown) => void, once?: boolean) => number;
  };
}
