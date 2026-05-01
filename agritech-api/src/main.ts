// Import Sentry instrumentation first!
import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, ExceptionFilter, Catch, ArgumentsHost, HttpException, BadRequestException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
// cookie-parser is CommonJS — TS-style require keeps it callable
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

// Global exception filter to log all 403 exceptions with stack traces
@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  private errorRecorder: { recordError: () => void } | null = null;

  setErrorRecorder(recorder: { recordError: () => void }) {
    this.errorRecorder = recorder;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestId = (request as any).requestId || 'unknown';

    let status = 500;
    let message: any = 'Internal server error';
    let stack = '';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Preserve the original error structure for validation errors
      if (typeof exceptionResponse === 'object') {
        message = exceptionResponse;
      } else {
        message = exceptionResponse;
      }
      stack = exception.stack || '';
    } else if (
      exception instanceof Error &&
      (exception.constructor.name === 'PayloadTooLargeError' ||
        (exception as { type?: string }).type === 'entity.too.large')
    ) {
      status = 413;
      message = exception.message || 'Request body too large';
      stack = exception.stack || '';
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack || '';
    }

    // Log 403 and 500 errors with full details
    if (status === 403 || status >= 500) {
      console.error(`\n========== [EXCEPTION FILTER #${requestId}] ${status} ==========`);
      console.error(`URL: ${request.method} ${request.url}`);
      console.error(`Message: ${typeof message === 'object' ? JSON.stringify(message) : message}`);
      console.error(`Exception Type: ${exception?.constructor?.name}`);
      console.error(`Stack trace (first 15 lines):\n${stack.split('\n').slice(0, 15).join('\n')}`);
      console.error(`==========================================================\n`);
    }

    // Track error rate for health monitoring
    if (status >= 500) {
      this.errorRecorder?.recordError();
      Sentry.captureException(exception);
    }

    // Build response object, preserving validation error structure
    const responseBody: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Preserve the full error structure for validation errors
    if (typeof message === 'object' && message !== null) {
      // For ValidationPipe errors, preserve the message array
      Object.assign(responseBody, message);
    } else {
      responseBody.message = message;
    }

    response.status(status).json(responseBody);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    // Use our own express.json() below so we can set BODY_JSON_LIMIT (Nest default is ~100kb).
    bodyParser: false,
  });

  const logger = new Logger('Bootstrap');

  // Get config service
  const configService = app.get(ConfigService);

  const bodyJsonLimit =
    configService.get<string>('BODY_JSON_LIMIT') ?? '50mb';

  // Capture raw body for webhook signature verification.
  // Default Express JSON limit is 100kb — too small for org demo-data import payloads.
  app.use(
    json({
      limit: bodyJsonLimit,
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: bodyJsonLimit }));
  logger.log(`JSON / urlencoded body size limit: ${bodyJsonLimit}`);

  // Cookie parser — required for httpOnly auth cookies
  app.use(cookieParser());

  // CSRF defense — Origin check for state-changing methods.
  // With cookie-based auth, attacker pages can trigger requests that auto-send
  // cookies. We block requests whose Origin/Referer doesn't match an allowed
  // origin. Cheap, deployable, and works with the existing CORS allowlist.
  // Doesn't apply to GET/HEAD/OPTIONS, requests with no cookies (Bearer-only
  // mobile clients), or whitelisted endpoints.
  const csrfWhitelist = ['/api/v1/auth/oauth/callback']; // Public endpoints invoked from third parties
  app.use((req, res, next) => {
    const method = req.method.toUpperCase();
    const stateChanging = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
    if (!stateChanging) return next();
    if (csrfWhitelist.some(p => req.path.startsWith(p))) return next();

    // No cookies = Bearer-only client (mobile / SDK) — let JWT auth handle it
    const hasAuthCookie = !!(req as any).cookies?.agg_access || !!(req as any).cookies?.agg_refresh;
    if (!hasAuthCookie) return next();

    const origin = req.headers.origin || req.headers.referer || '';
    const allowed = (configService.get('CORS_ORIGIN', 'http://localhost:5173') as string)
      .split(',').map(s => s.trim());
    const ok =
      !origin // Same-origin requests have no Origin header — allow
      || allowed.some(a => a === '*' || origin.startsWith(a))
      || (process.env.NODE_ENV !== 'production' && origin.includes('localhost'));

    if (!ok) {
      logger.warn(`[CSRF] Blocked ${method} ${req.path} from origin ${origin}`);
      return res.status(403).json({ statusCode: 403, message: 'CSRF: origin not allowed' });
    }
    next();
  });

  // Configure WebSocket adapter for Socket.IO
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global request logger middleware
  // In production, only log slow or error responses to reduce log noise
  const isProduction = configService.get('NODE_ENV') === 'production';
  let requestCounter = 0;
  app.use((req, res, next) => {
    const requestId = ++requestCounter;
    // Reset counter to prevent overflow (safe since Node.js is single-threaded)
    if (requestCounter > 1_000_000_000) requestCounter = 0;
    const start = Date.now();

    // Store requestId on request for later use
    (req as any).requestId = requestId;

    if (!isProduction) {
      logger.debug(`[Request #${requestId}] ${req.method} ${req.url}`);
    }

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      // In production: only log slow (>3s) or error responses
      if (!isProduction || res.statusCode >= 400 || duration > 3000) {
        logger.log(`[${requestId}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
      }
    });

    next();
  });

  // Security middleware - Helmet sets various HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: configService.get('NODE_ENV') === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Use detailed error format that includes field names
      // This enables generic frontend error handling without string matching
      exceptionFactory: (errors) => {
        // Return detailed errors with field names
        // Format: { errors: [{ property: "field_name", constraints: {}, message: "..." }] }
        const formattedErrors = errors.map((error) => {
          const constraints = error.constraints || {};
          const messages = Object.values(constraints);
          return {
            property: error.property,
            constraints,
            messages,
            message: messages.join('. ') || 'Validation failed',
            // Include nested errors (for nested objects/arrays)
            children: error.children?.map((child) => ({
              property: child.property,
              constraints: child.constraints,
              messages: Object.values(child.constraints || {}),
            })),
          };
        });

        return new BadRequestException({
          statusCode: 400,
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    }),
  );

  // Global exception filter to capture and log 403 errors with stack traces
  const exceptionFilter = new AllExceptionsFilter();
  try {
    const { HealthService } = await import('./modules/health/health.service');
    const healthService = app.get(HealthService);
    exceptionFilter.setErrorRecorder(healthService);
  } catch {
    // HealthService not available — error rate tracking disabled
  }
  app.useGlobalFilters(exceptionFilter);

  // Enable CORS
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:5173');
  const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());

  logger.log(`CORS Origins configured: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or curl)
      if (!origin) {
        logger.debug('CORS: Allowing request with no origin');
        return callback(null, true);
      }

      logger.debug(`CORS: Checking origin: ${origin}`);

      // Check if origin is in configured allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        logger.debug(`CORS: Origin ${origin} is allowed`);
        return callback(null, true);
      }

      // For development, allow localhost with any port
      if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
        logger.debug(`CORS: Allowing localhost origin in development: ${origin}`);
        return callback(null, true);
      }

      logger.warn(`CORS: Origin ${origin} is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`);
      // Return false instead of throwing error to avoid 500 errors
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Request-ID',
      'X-Organization-Id',
      'x-organization-id',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'Cache-Control',
      'Pragma',
      // Analytics headers for device tracking
      'X-Device-Id',
      'x-device-id',
      'X-Device-Type',
      'x-device-type',
      'X-Device-OS',
      'x-device-os',
      'X-App-Version',
      'x-app-version',
      // Marketplace headers
      'X-Client-App',
      'x-client-app',
      'X-Locale',
      'x-locale',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Set global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['blog', 'blog/(.*)', 'sitemap.xml', 'rss.xml'],
  });

  logger.log(`Global prefix set to: ${apiPrefix}`);

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('AgroGina API')
    .setDescription(`
# AgroGina Platform Business Logic API

NestJS-based backend service handling complex business logic for the AgroGina multi-tenant agricultural SaaS platform.

## Overview

This API provides:
- **Accounting**: Double-entry bookkeeping, journal entries, invoicing, payments
- **Financial Reports**: Balance sheets, P&L statements, trial balances
- **Farm Management**: Organizations, farms, parcels, structures
- **Production**: Harvests, yield analytics, tree management
- **Inventory**: Stock entries, warehouses, reception batches
- **Workforce**: Workers, tasks, piece-work, work units
- **CRM**: Customers, suppliers, marketplace
- **Platform**: Subscriptions, notifications, document templates

## Authentication

All endpoints (except health checks) require a valid Supabase JWT token:

\`\`\`
Authorization: Bearer <supabase-jwt-token>
\`\`\`

## Multi-Tenancy

Include the organization ID header for organization-scoped operations:

\`\`\`
X-Organization-Id: <organization-uuid>
\`\`\`

## Error Responses

All errors follow a standard format:
\`\`\`json
{
  "statusCode": 400,
  "message": "Error description",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/endpoint"
}
\`\`\`
    `)
    .setVersion('1.0.0')
    .setContact('AgroGina Team', 'https://agrogina.thebzlab.online', 'support@thebzlab.online')
    .setLicense('ISC', 'https://opensource.org/licenses/ISC')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your Supabase JWT token',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-Organization-Id',
        description: 'Organization ID for multi-tenant operations',
      },
      'X-Organization-Id',
    )
    // Authentication & Authorization
    .addTag('auth', 'Authentication - Login, signup, password reset, session management')
    .addTag('users', 'User Management - User profiles and preferences')
    .addTag('roles', 'Role Management - Role definitions and permissions')
    .addTag('onboarding', 'Onboarding - New user onboarding flow')
    // Organization & Farm Management
    .addTag('organizations', 'Organization Management - Multi-tenant organization operations')
    .addTag('organization-users', 'Organization Users - User membership and roles within organizations')
    .addTag('organization-modules', 'Organization Modules - Feature module access per organization')
    .addTag('farms', 'Farm Management - Farm CRUD operations')
    .addTag('parcels', 'Parcel Management - Agricultural parcel operations')
    .addTag('structures', 'Farm Structures - Buildings, greenhouses, infrastructure')
    .addTag('utilities', 'Farm Utilities - Irrigation, electricity, water systems')
    // Accounting
    .addTag('sequences', 'Document Sequences - Auto-generation of invoice, quote, and order numbers')
    .addTag('accounts', 'Chart of Accounts - Account management (OHADA/IFRS support)')
    .addTag('journal-entries', 'Journal Entries - Double-entry bookkeeping transactions')
    .addTag('invoices', 'Invoices - Sales and purchase invoice management')
    .addTag('payments', 'Payments - Payment processing and allocation')
    .addTag('payment-records', 'Payment Records - Payment history and tracking')
    .addTag('quotes', 'Quotes - Price quotation management')
    .addTag('sales-orders', 'Sales Orders - Sales order processing')
    .addTag('purchase-orders', 'Purchase Orders - Purchase order management')
    .addTag('taxes', 'Taxes - Tax configuration and calculations')
    .addTag('cost-centers', 'Cost Centers - Department/division cost tracking')
    .addTag('account-mappings', 'Account Mappings - Automatic account assignment rules')
    .addTag('bank-accounts', 'Bank Accounts - Bank account management')
    .addTag('financial-reports', 'Financial Reports - Balance sheet, P&L, trial balance')
    // Production
    .addTag('harvests', 'Harvests - Harvest recording and tracking')
    .addTag('production-intelligence', 'Production Intelligence - Yield analytics, benchmarks, forecasts')
    .addTag('tree-management', 'Tree Management - Orchard and tree tracking')
    .addTag('product-applications', 'Product Applications - Fertilizer, pesticide, irrigation applications')
    .addTag('profitability', 'Profitability - Profitability analysis per parcel/crop')
    // Inventory
    .addTag('items', 'Items - Product and item catalog')
    .addTag('stock-entries', 'Stock Entries - Inventory movements (in/out/transfer)')
    .addTag('warehouses', 'Warehouses - Warehouse and storage location management')
    .addTag('reception-batches', 'Reception Batches - Incoming goods reception')
    .addTag('deliveries', 'Deliveries - Outgoing delivery management')
    // Workforce
    .addTag('workers', 'Workers - Employee and contractor management')
    .addTag('tasks', 'Tasks - Task creation and management')
    .addTag('task-assignments', 'Task Assignments - Worker task assignments')
    .addTag('piece-work', 'Piece Work - Piece-rate work tracking and payment')
    .addTag('work-units', 'Work Units - Work unit definitions (hours, kg, pieces)')
    // CRM
    .addTag('customers', 'Customers - Customer management')
    .addTag('suppliers', 'Suppliers - Supplier management')
    .addTag('marketplace', 'Marketplace - B2B agricultural marketplace')
    // Analysis
    .addTag('analyses', 'Analyses - General analysis operations')
    .addTag('soil-analyses', 'Soil Analyses - Soil testing and results')
    .addTag('satellite-indices', 'Satellite Indices - Vegetation index calculations (proxy to Python service)')
    .addTag('lab-services', 'Lab Services - Laboratory service integrations')
    // Platform
    .addTag('subscriptions', 'Subscriptions - Subscription plan management')
    .addTag('notifications', 'Notifications - Notification system')
    .addTag('events', 'Events - Event handling and webhooks')
    .addTag('files', 'Files - File upload and management')
    .addTag('document-templates', 'Document Templates - Invoice, quote, report templates')
    .addTag('reports', 'Reports - Report generation')
    .addTag('dashboard', 'Dashboard - Dashboard data and widgets')
    .addTag('admin', 'Admin - System administration operations')
    .addTag('demo-data', 'Demo Data - Demo data generation for testing')
    // Integrations
    .addTag('blogs', 'Blogs - Blog content from Strapi CMS')
    .addTag('reference-data', 'Reference Data - Reference data synchronization')
    // Health
    .addTag('health', 'Health - Health checks and status endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  logger.log('Swagger docs available at /api/docs');

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Start server
  const port = configService.get('PORT', 3000);
  await app.listen(port, '0.0.0.0'); // Listen on all interfaces for Docker

  const url = await app.getUrl();
  logger.log(`Application is running on: ${url}`);

  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
   ║   🌾 AgroGina API Server                             ║
  ║                                                       ║
  ║   Server running on: http://0.0.0.0:${port}             ║
  ║   API Docs: http://0.0.0.0:${port}/api/docs             ║
  ║   Environment: ${configService.get('NODE_ENV')}                      ║
  ║   Global Prefix: /${apiPrefix}                        ║
  ║                                                       ║
  ║   Try: curl http://localhost:${port}/${apiPrefix}/health   ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);

  // Log sample endpoints
  logger.log('\n📋 Available Endpoints:');
  logger.log(`   GET  /${apiPrefix}`);
  logger.log(`   GET  /${apiPrefix}/health`);
  logger.log(`   POST /${apiPrefix}/auth/signup`);
  logger.log(`   GET  /${apiPrefix}/auth/me`);
  logger.log(`   POST /${apiPrefix}/sequences/invoice`);
  logger.log(`   GET  /api/docs (Swagger UI)\n`);
}

bootstrap();
