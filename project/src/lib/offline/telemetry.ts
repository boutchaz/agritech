type Props = Record<string, unknown>;

interface PostHogLike {
  capture: (event: string, props?: Props) => void;
}

function getPosthog(): PostHogLike | null {
  if (typeof window === 'undefined') return null;
  const ph = (window as unknown as { posthog?: PostHogLike }).posthog;
  return ph ?? null;
}

export const telemetry = {
  track(event: string, props?: Props) {
    try {
      getPosthog()?.capture(`offline.${event}`, props);
    } catch {
      // never throw from telemetry
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[offline.telemetry] ${event}`, props ?? {});
    }
  },
  gauge(name: string, value: number, props?: Props) {
    this.track(`gauge.${name}`, { value, ...(props ?? {}) });
  },
};
