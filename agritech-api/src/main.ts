import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(ConfigService);

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
  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });

  // Set global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Enable versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

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
    .addTag('workers', 'Worker management')
    .addTag('stock', 'Stock/Inventory management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = configService.get('PORT', 3000);
  await app.listen(port, '0.0.0.0'); // Listen on all interfaces for Docker

  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   🌾 AgriTech API Server                             ║
  ║                                                       ║
  ║   Server running on: http://0.0.0.0:${port}             ║
  ║   API Docs: http://0.0.0.0:${port}/api/docs             ║
  ║   Environment: ${configService.get('NODE_ENV')}                      ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
}

bootstrap();
