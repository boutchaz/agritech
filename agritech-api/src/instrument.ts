import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: 'https://be291e1436308fbe2e941dcd1366de57@o4511104265420800.ingest.de.sentry.io/4511104356712528',
  integrations: [nodeProfilingIntegration()],
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  // Profiling
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  environment: process.env.NODE_ENV || 'development',
});
