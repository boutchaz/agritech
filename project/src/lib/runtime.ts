/**
 * Runtime detection for Tauri desktop vs web browser.
 * 
 * Uses window.__TAURI__ which is injected by Tauri runtime.
 * This is the most reliable way to detect Tauri environment
 * without relying on build-time environment variables.
 */

// Check for Tauri runtime - window.__TAURI__ is injected by Tauri
function checkIsTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI__' in window && window.__TAURI__ !== undefined;
}

export const isDesktop = checkIsTauri();
export const isWeb = !isDesktop;

export function getRuntime(): 'desktop' | 'web' {
  return isDesktop ? 'desktop' : 'web';
}

/**
 * Helper to safely check Tauri availability at runtime.
 * Useful for components that need to conditionally render.
 */
export function isTauriAvailable(): boolean {
  return checkIsTauri();
}
