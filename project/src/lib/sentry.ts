import * as Sentry from '@sentry/react';

export function initSentry(router: unknown) {
  Sentry.init({
    dsn: 'https://69d81690beeb1075d0a92837e58ca586@o4511104265420800.ingest.de.sentry.io/4511104269549648',
    integrations: [
      Sentry.tanstackRouterBrowserTracingIntegration(router),
      Sentry.replayIntegration(),
    ],
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Only send errors in production
    enabled: import.meta.env.PROD,
    environment: import.meta.env.MODE,
  });
}

export { Sentry };
