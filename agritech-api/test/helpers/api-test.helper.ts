import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../src/modules/casl/policies.guard';

/**
 * API Test Helper - Creates a test application with mocked auth
 * for integration testing of API endpoints
 */
export class ApiTestHelper {
  private app: INestApplication;
  private module: TestingModule;

  /**
   * Create and initialize the test application
   */
  async init() {
    // Mock JWT Auth Guard - bypasses authentication
    const mockAuthGuard = {
      canActivate: (context: any) => {
        const request = context.switchToHttp().getRequest();
        request.user = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'test@example.com',
          role: 'owner',
        };
        return true;
      },
    };

    // Mock Policies Guard - bypasses authorization
    const mockPoliciesGuard = {
      canActivate: () => true,
    };

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
 * Base test setup function for API integration tests
 */
export async function setupApiTest() {
  const helper = new ApiTestHelper();
  await helper.init();
  return helper;
}
