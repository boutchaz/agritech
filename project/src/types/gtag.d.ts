declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    clarity: ClarityAPI;
  }
}

interface ClarityAPI {
  (event: string, ...args: any[]): void;
  q?: any[];
  /**
   * Set a custom user property
   * @param key - Property name
   * @param value - Property value
   */
  set(key: string, value: string): void;
  /**
   * Identify a user across sessions
   * @param userId - Unique user identifier
   * @param attributes - Optional custom attributes
   */
  identify(userId: string, attributes?: Record<string, string | number | boolean>): void;
  /**
   * Track a custom event
   * @param eventName - Event name
   * @param value - Optional numeric value
   */
  event(eventName: string, value?: number): void;
}

export {};
