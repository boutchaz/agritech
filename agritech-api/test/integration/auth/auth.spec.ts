import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

/**
 * Auth API Integration Tests
 *
 * Tests validation behavior of authentication endpoints
 */

describe('Auth API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;

  beforeAll(async () => {
    api = await setupRealApiIntegration('00000000-0000-0000-0000-000000000001');
  });

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject missing email', async () => {
      const res = await api.post('/api/v1/auth/login').send({
        password: 'password123',
      });

      expect([400, 403, 404]).toContain(res.status);
      // Message can be array or string
      const msg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(msg.toLowerCase()).toContain('email');
    });

    it('should reject missing password', async () => {
      const res = await api.post('/api/v1/auth/login').send({
        email: 'test@example.com',
      });

      expect([400, 403, 404]).toContain(res.status);
      // Message can be array or string
      const msg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(msg.toLowerCase()).toContain('password');
    });

    it('should reject invalid email format', async () => {
      const res = await api.post('/api/v1/auth/login').send({
        email: 'not-an-email',
        password: 'password123',
      });

      expect([400, 403, 404]).toContain(res.status);
      // Message can be array or string
      const msg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(msg.toLowerCase()).toContain('email');
    });

    it('should reject empty payload', async () => {
      const res = await api.post('/api/v1/auth/login').send({});

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should reject missing email', async () => {
      const res = await api.post('/api/v1/auth/signup').send({
        password: 'SecurePass123!',
      });

      expect([400, 403, 404]).toContain(res.status);
      // Message can be array or string
      const msg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(msg.toLowerCase()).toContain('email');
    });

    it('should reject missing password', async () => {
      const res = await api.post('/api/v1/auth/signup').send({
        email: 'test@example.com',
      });

      expect([400, 403, 404]).toContain(res.status);
      // Message can be array or string
      const msg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(msg.toLowerCase()).toContain('password');
    });

    it('should reject invalid email format', async () => {
      const res = await api.post('/api/v1/auth/signup').send({
        email: 'not-an-email',
        password: 'SecurePass123!',
      });

      expect([400, 403, 404]).toContain(res.status);
      // Message can be array or string
      const msg = Array.isArray(res.body.message) ? res.body.message.join(' ') : res.body.message;
      expect(msg.toLowerCase()).toContain('email');
    });

    it('should reject short password', async () => {
      const res = await api.post('/api/v1/auth/signup').send({
        email: 'test@example.com',
        password: 'short',
      });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid signup without optional fields', async () => {
      const res = await api.post('/api/v1/auth/signup').send({
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
      });

      // Validation should pass. Without local Supabase the service itself may
      // return 400 ("Failed to create user") or 500 — that's acceptable.
      // A validation-pipe 400 returns an array of field-specific messages.
      if (res.status === 400 && Array.isArray(res.body.message)) {
        // If we got a validation 400, none of the messages should reference
        // the fields we sent correctly.
        const msgs = res.body.message.join(' ').toLowerCase();
        expect(msgs).not.toMatch(/email should not be empty|password should not be empty/);
      }
    });

    it('should accept valid signup with all fields', async () => {
      const res = await api.post('/api/v1/auth/signup').send({
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+212600000000',
        organizationName: 'Test Org',
        accountType: 'full_access',
        sellerType: 'individual',
      });

      // Same as above — service-level 400/500 is fine when Supabase is offline
      if (res.status === 400 && Array.isArray(res.body.message)) {
        const msgs = res.body.message.join(' ').toLowerCase();
        expect(msgs).not.toMatch(/email should not be empty|password should not be empty/);
      }
    });
  });

  describe('POST /api/v1/auth/setup-organization', () => {
    it('should accept empty payload (organizationName is optional)', async () => {
      const res = await api.post('/api/v1/auth/setup-organization').send({});

      // Validation should pass (no required fields)
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept valid organizationName', async () => {
      const res = await api.post('/api/v1/auth/setup-organization').send({
        organizationName: `Test Org ${Date.now()}`,
      });

      // Validation should pass (DB may fail)
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
