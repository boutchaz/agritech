import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../src/modules/casl/policies.guard';

/**
 * Real API Integration Test Helper
 *
 * Creates a test application with:
 * - Real services and database connections
 * - Bypassed authentication (for testing)
 * - Real validation pipes, interceptors, etc.
 *
 * Use this for true API integration testing where you want to test
 * actual database operations.
 */
export class ApiIntegrationTestHelper {
  private app: INestApplication;
  private module: TestingModule;
  private testUserId: string;
  private testUserEmail: string;

  constructor(testUserId?: string, testUserEmail?: string) {
    this.testUserId = testUserId || '00000000-0000-0000-0000-000000000001';
    this.testUserEmail = testUserEmail || 'test-integration@example.com';
  }

  /**
   * Create and initialize the test application
   * NOTE: Requires DATABASE_URL to be set (use test database!)
   */
  async init() {
    // Mock ONLY the JWT Auth Guard - keep real services
    const mockAuthGuard = {
      canActivate: (context: any) => {
        const request = context.switchToHttp().getRequest();
        // Simulate authenticated user
        request.user = {
          id: this.testUserId,
          email: this.testUserEmail,
          role: 'owner',
        };
        return true;
      },
    };

    // Mock ONLY the Policies Guard - keep real services
    const mockPoliciesGuard = {
      canActivate: () => true,
    };

    // Create module WITHOUT mocking services - use real ones
    this.module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(PoliciesGuard)
      .useValue(mockPoliciesGuard)
      .compile();

    this.app = this.module.createNestApplication();

    // Apply same configuration as main.ts
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    this.app.setGlobalPrefix('api/v1');
    await this.app.init();
  }

  /**
   * Get the HTTP server for supertest
   */
  getServer() {
    return this.app.getHttpServer();
  }

  /**
   * Get the NestJS application instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get the testing module (for accessing services)
   */
  getModule() {
    return this.module;
  }

  /**
   * Get a service from the container
   */
  getService<T>(token: any): T {
    return this.module.get<T>(token);
  }

  /**
   * Make a GET request
   */
  get(url: string) {
    return request(this.getServer()).get(url);
  }

  /**
   * Make a POST request
   */
  post(url: string) {
    return request(this.getServer()).post(url);
  }

  /**
   * Make a PATCH request
   */
  patch(url: string) {
    return request(this.getServer()).patch(url);
  }

  /**
   * Make a DELETE request
   */
  delete(url: string) {
    return request(this.getServer()).delete(url);
  }

  /**
   * Cleanup and close the application
   */
  async cleanup() {
    if (this.app) {
      await this.app.close();
    }
  }
}

/**
 * Base test setup function for real API integration tests
 */
export async function setupRealApiIntegration(
  testUserId?: string,
  testUserEmail?: string,
) {
  const helper = new ApiIntegrationTestHelper(testUserId, testUserEmail);
  await helper.init();
  return helper;
}
