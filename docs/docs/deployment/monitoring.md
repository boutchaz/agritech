# Monitoring and Observability

Comprehensive guide for monitoring the AgriTech Platform in production.

## Table of Contents

- [Monitoring Strategy](#monitoring-strategy)
- [Error Tracking](#error-tracking)
- [Performance Monitoring](#performance-monitoring)
- [Uptime Monitoring](#uptime-monitoring)
- [Database Monitoring](#database-monitoring)
- [Logging](#logging)
- [Alerts and Notifications](#alerts-and-notifications)
- [Dashboards](#dashboards)

## Monitoring Strategy

### The Four Golden Signals

1. **Latency**: Response time of requests
2. **Traffic**: Number of requests per second
3. **Errors**: Rate of failed requests
4. **Saturation**: Resource utilization (CPU, memory, disk)

### Monitoring Levels

```
Application Layer
├── Frontend Performance (Core Web Vitals)
├── API Response Times
├── Error Rates
└── User Actions

Infrastructure Layer
├── Server CPU/Memory
├── Database Connections
├── Network Bandwidth
└── Disk Usage

Business Layer
├── User Signups
├── Subscription Conversions
├── Feature Usage
└── Revenue Metrics
```

## Error Tracking

### Sentry Integration

**1. Install Sentry**:

```bash
npm install @sentry/react @sentry/tracing
```

**2. Configure Sentry** (frontend):

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      new BrowserTracing({
        tracingOrigins: [
          'localhost',
          'app.yourdomain.com',
          'satellite.yourdomain.com',
        ],
      }),
    ],
    tracesSampleRate: 0.1, // 10% of transactions
    beforeSend(event, hint) {
      // Filter out noisy errors
      if (event.exception?.values?.[0]?.value?.includes('Network request failed')) {
        return null; // Don't send network errors
      }
      return event;
    },
  });
}
```

**3. Error Boundaries**:

```typescript
// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error:', error, errorInfo);
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**4. Manual Error Reporting**:

```typescript
try {
  await createFarm(farmData);
} catch (error) {
  console.error('Farm creation failed:', error);
  Sentry.captureException(error, {
    tags: {
      feature: 'farm-management',
      action: 'create',
    },
    extra: {
      farmData,
      userId: user?.id,
    },
  });
  toast.error('Failed to create farm');
}
```

**5. User Context**:

```typescript
// Set user context when logged in
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.profile?.name,
});

// Clear on logout
Sentry.setUser(null);
```

**6. Backend Error Tracking** (Python):

```python
# satellite-indices-service
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
    environment="production",
)
```

### Error Monitoring Best Practices

- **Group similar errors**: Use fingerprints
- **Set up alerts**: Email/Slack for critical errors
- **Triage regularly**: Review and fix high-impact errors
- **Track error trends**: Monitor error rate over time
- **Add context**: Include user actions, state, and environment

## Performance Monitoring

### Core Web Vitals

**1. Real User Monitoring (RUM)**:

```typescript
// src/lib/performance.ts
export const reportWebVitals = (metric: Metric) => {
  const { name, value, id } = metric;

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`${name}:`, value);
  }

  // Send to analytics
  if (import.meta.env.PROD) {
    // Google Analytics
    gtag('event', name, {
      event_category: 'Web Vitals',
      value: Math.round(value),
      event_label: id,
      non_interaction: true,
    });

    // Or send to custom endpoint
    fetch('/api/analytics/vitals', {
      method: 'POST',
      body: JSON.stringify({ name, value, id }),
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// In main.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(reportWebVitals);
getFID(reportWebVitals);
getFCP(reportWebVitals);
getLCP(reportWebVitals);
getTTFB(reportWebVitals);
```

**2. Performance Thresholds**:

```typescript
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
};

const getRating = (name: string, value: number) => {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
};
```

**3. React Query Performance**:

```typescript
// Monitor query performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onSuccess: (data, query) => {
        const duration = Date.now() - query.state.dataUpdatedAt;
        if (duration > 2000) {
          console.warn(`Slow query: ${query.queryKey}`, duration);
          Sentry.captureMessage(`Slow query: ${query.queryKey}`, {
            level: 'warning',
            extra: { duration, queryKey: query.queryKey },
          });
        }
      },
    },
  },
});
```

### API Response Time Monitoring

**Backend instrumentation**:

```python
# satellite-indices-service/app/middleware.py
import time
from fastapi import Request

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    # Add header
    response.headers["X-Process-Time"] = str(process_time)

    # Log slow requests
    if process_time > 5.0:
        logger.warning(
            f"Slow request: {request.url.path}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "duration": process_time,
            }
        )

    return response
```

## Uptime Monitoring

### External Monitoring Services

**1. UptimeRobot (Free)**:

Setup:
1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create monitors:
   - `app.yourdomain.com` (HTTP(s))
   - `satellite.yourdomain.com/health` (HTTP(s))
   - `your-project.supabase.co` (HTTP(s))
3. Set check interval: 5 minutes
4. Configure alerts (email, Slack, SMS)

**2. Pingdom**:

Features:
- Global monitoring locations
- Transaction monitoring (multi-step checks)
- Real browser testing
- Performance insights

**3. Custom Health Checks**:

```typescript
// Frontend health endpoint
// src/routes/health.tsx
export const Route = createFileRoute('/health')({
  component: () => {
    return (
      <div>
        <h1>OK</h1>
        <p>Version: {import.meta.env.VITE_APP_VERSION}</p>
        <p>Timestamp: {new Date().toISOString()}</p>
      </div>
    );
  },
});
```

```python
# Backend health endpoint
# satellite-indices-service/app/api/health.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "gee": await check_gee_connection(),
            "supabase": await check_supabase_connection(),
        }
    }

async def check_gee_connection() -> bool:
    try:
        ee.Number(1).getInfo()
        return True
    except:
        return False
```

### Status Page

**Create public status page**:

Options:
- **Statuspage.io** (by Atlassian)
- **Cachet** (self-hosted, open source)
- **Custom page** with uptime data

Example custom status page:

```typescript
// src/routes/status.tsx
export const StatusPage = () => {
  const { data: status } = useQuery({
    queryKey: ['system-status'],
    queryFn: fetchSystemStatus,
    refetchInterval: 60000, // Every minute
  });

  return (
    <div>
      <h1>System Status</h1>
      <StatusIndicator
        name="Application"
        status={status?.app}
        url="https://app.yourdomain.com"
      />
      <StatusIndicator
        name="Satellite Service"
        status={status?.satellite}
        url="https://satellite.yourdomain.com"
      />
      <StatusIndicator
        name="Database"
        status={status?.database}
      />
      <IncidentHistory incidents={status?.incidents} />
    </div>
  );
};
```

## Database Monitoring

### Supabase Monitoring

**1. Dashboard Metrics**:

Monitor in Supabase Dashboard → Reports:
- API requests per second
- Database connections
- Database size
- Storage usage
- Auth users

**2. Query Performance**:

```sql
-- Find slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**3. Connection Pool Monitoring**:

```sql
-- Current connections
SELECT
  datname,
  count(*) as connections,
  max_connections
FROM pg_stat_activity, pg_settings
WHERE name = 'max_connections'
GROUP BY datname, max_connections;

-- Idle connections
SELECT count(*) as idle_connections
FROM pg_stat_activity
WHERE state = 'idle';
```

**4. Alerts**:

Set up alerts for:
- Connection pool exhaustion (> 80% used)
- Slow queries (> 5 seconds)
- High CPU usage (> 80%)
- Database size approaching limit
- Replication lag (if using replicas)

## Logging

### Structured Logging

**Frontend**:

```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, data?: Record<string, any>) => {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, data);
    }
    // Send to logging service in production
    if (import.meta.env.PROD) {
      sendLog('info', message, data);
    }
  },

  error: (message: string, error?: Error, data?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, error, data);
    if (import.meta.env.PROD) {
      Sentry.captureException(error, {
        tags: { message },
        extra: data,
      });
    }
  },

  warn: (message: string, data?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, data);
    if (import.meta.env.PROD) {
      sendLog('warn', message, data);
    }
  },
};

// Usage
logger.info('User created farm', { farmId, userId });
logger.error('Failed to fetch farms', error, { organizationId });
```

**Backend**:

```python
# satellite-indices-service/app/core/logging.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if hasattr(record, 'extra'):
            log_data.update(record.extra)
        return json.dumps(log_data)

# Configure logger
logging.basicConfig(
    level=logging.INFO,
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.handlers[0].setFormatter(JSONFormatter())

# Usage
logger.info("Processing satellite data", extra={
    "parcel_id": parcel_id,
    "indices": indices,
    "date_range": f"{start_date} to {end_date}",
})
```

### Log Aggregation

**Options**:

1. **Vercel/Netlify Logs**:
   - Built-in logging
   - View in dashboard
   - Export to external services

2. **CloudWatch** (AWS):
   - Centralized logging
   - Search and filter
   - Metrics from logs

3. **Datadog**:
   - Full observability platform
   - Logs + Metrics + Traces
   - Advanced analysis

4. **Loki** (self-hosted):
   - Open-source log aggregation
   - Integrates with Grafana
   - Cost-effective

## Alerts and Notifications

### Alert Channels

**Slack Integration**:

```python
# Send alerts to Slack
import requests

def send_slack_alert(message: str, level: str = "warning"):
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    color = {"info": "good", "warning": "warning", "error": "danger"}[level]

    payload = {
        "attachments": [{
            "color": color,
            "title": f"AgriTech Alert - {level.upper()}",
            "text": message,
            "footer": "AgriTech Monitoring",
            "ts": int(time.time()),
        }]
    }

    requests.post(webhook_url, json=payload)

# Usage
send_slack_alert(
    "High error rate detected: 25% of requests failing",
    level="error"
)
```

### Alert Rules

**Define alert thresholds**:

```yaml
# alerts.yml
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    channels: [slack, pagerduty]

  - name: slow_response_time
    condition: p95_response_time > 2s
    duration: 10m
    severity: warning
    channels: [slack]

  - name: database_connections_high
    condition: db_connections > 80% of max
    duration: 5m
    severity: warning
    channels: [slack, email]

  - name: disk_space_low
    condition: disk_usage > 85%
    duration: 1h
    severity: critical
    channels: [slack, pagerduty, email]
```

### On-Call Rotation

**PagerDuty** or similar:
- Define escalation policies
- Set up on-call schedules
- Auto-escalate unacknowledged alerts
- Integrate with Slack and email

## Dashboards

### Grafana Dashboard

**Example dashboard**:

```json
{
  "dashboard": {
    "title": "AgriTech Platform Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds)"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_activity_count"
          }
        ]
      }
    ]
  }
}
```

### Custom Dashboard

```typescript
// src/routes/admin/monitoring.tsx
export const MonitoringDashboard = () => {
  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 30000, // Every 30 seconds
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        title="Active Users"
        value={metrics?.activeUsers}
        trend={metrics?.usersTrend}
      />
      <MetricCard
        title="API Requests/min"
        value={metrics?.requestsPerMinute}
        trend={metrics?.requestsTrend}
      />
      <MetricCard
        title="Error Rate"
        value={`${metrics?.errorRate}%`}
        trend={metrics?.errorTrend}
        alert={metrics?.errorRate > 5}
      />
      <MetricCard
        title="Avg Response Time"
        value={`${metrics?.avgResponseTime}ms`}
        trend={metrics?.responseTrend}
      />
    </div>
  );
};
```

## Monitoring Checklist

### Daily
- [ ] Check error rate in Sentry
- [ ] Review slow queries
- [ ] Check uptime status
- [ ] Verify backups completed

### Weekly
- [ ] Review performance metrics
- [ ] Check resource usage trends
- [ ] Review and close resolved incidents
- [ ] Update status page if needed

### Monthly
- [ ] Full system health review
- [ ] Update alert thresholds
- [ ] Review and optimize slow endpoints
- [ ] Analyze user behavior patterns
- [ ] Cost optimization review

---

Comprehensive monitoring ensures the AgriTech Platform remains reliable, performant, and available for all users.
