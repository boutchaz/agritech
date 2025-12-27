import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');

  // Get config service
  const configService = app.get(ConfigService);

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
    }),
  );

  // Enable CORS
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:5173');
  const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());

  logger.log(`CORS Origins configured: ${allowedOrigins.join(', ')}`);

  const alwaysAllowedOrigins = [
    'https://marketplace.thebzlab.online',
    'https://dashboard.thebzlab.online',
    'https://agritech.thebzlab.online',
    'https://agritech-dashboard.thebzlab.online',
    'https://agritech-api.thebzlab.online',
    'https://agritech-marketplace.thebzlab.online',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or curl)
      if (!origin) {
        logger.debug('CORS: Allowing request with no origin');
        return callback(null, true);
      }

      logger.debug(`CORS: Checking origin: ${origin}`);

      // Check if origin is in always-allowed list
      if (alwaysAllowedOrigins.includes(origin)) {
        logger.debug(`CORS: Origin ${origin} is in always-allowed list`);
        return callback(null, true);
      }

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

      // For thebzlab.online subdomains, allow them
      if (origin.endsWith('.thebzlab.online')) {
        logger.debug(`CORS: Allowing thebzlab.online subdomain: ${origin}`);
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
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Set global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  logger.log(`Global prefix set to: ${apiPrefix}`);

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('AgriTech API')
    .setDescription('AgriTech Platform Business Logic API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('authentication', 'Authentication endpoints')
    .addTag('sequences', 'Number sequence generation')
    .addTag('accounts', 'Chart of accounts management')
    .addTag('invoices', 'Invoice operations')
    .addTag('journal-entries', 'Journal entry management')
    .addTag('payments', 'Payment processing')
    .addTag('financial-reports', 'Financial reports and analytics')
    .addTag('production', 'Production intelligence')
    .addTag('harvests', 'Harvest management')
    .addTag('tasks', 'Task management')
    .addTag('workers', 'Management')
    .addTag('stock', 'Stock/Inventory management')
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
  ║   🌾 AgriTech API Server                             ║
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
