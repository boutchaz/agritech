import { setupRealApiIntegration, ApiIntegrationTestHelper } from './helpers/api-integration-test.helper';
import { DatabaseService } from '../src/modules/database/database.service';

// Simple ID generator for tests (avoiding ESM uuid package)
const generateTestId = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

/**
 * REAL API Integration Tests for Onboarding
 *
 * These tests make ACTUAL HTTP requests to a running NestJS application
 * with REAL database operations (not mocked).
 *
 * Prerequisites:
 * - Supabase credentials must be set in .env
 * - Use a test database or be careful with test data!
 *
 * To skip these tests: npm test -- --testNamePattern="^(?!.*Real API Integration)"
 */

describe('Onboarding Real API Integration Tests', () => {
  let api: ApiIntegrationTestHelper;
  let db: DatabaseService;

  // Generate unique test user ID for this test run
  const testUserId = generateTestId();
  const testUserEmail = `test-integration-${generateTestId()}@example.com`;

  beforeAll(async () => {
    // Check if we have database credentials
    const hasDbCreds =
      process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_URL);

    if (!hasDbCreds) {
      console.warn(
        '\n⚠️  Skipping real API integration tests - no database credentials found',
      );
      console.warn('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to run these tests\n');
    }

    api = await setupRealApiIntegration(testUserId, testUserEmail);
    db = api.getModule().get<DatabaseService>(DatabaseService);

    // Create test user in database
    const client = db.getAdminClient();
    const { error: profileError } = await client.from('user_profiles').insert({
      id: testUserId,
      email: testUserEmail,
      first_name: 'Test',
      last_name: 'Integration',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.warn('Could not create test user:', profileError.message);
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test user data
    try {
      const client = db.getAdminClient();

      // Delete organization_users
      await client.from('organization_users').delete().eq('user_id', testUserId);

      // Delete organizations created by test user (cascade should handle this)
      await client.from('organizations').delete().eq('created_by', testUserId);

      // Delete test user profile
      await client.from('user_profiles').delete().eq('id', testUserId);
    } catch (e) {
      console.warn('Cleanup warning:', (e as Error).message);
    }

    await api.cleanup();
  });

  beforeEach(() => {
    // Reset any module state between tests
  });

  describe('GET /api/v1/onboarding/state', () => {
    it('should return null when no onboarding state exists', async () => {
      const res = await api.get('/api/v1/onboarding/state').expect(200);

      // New user should have no onboarding state
      expect(res.body).toBeNull();
    });

    it('should get onboarding state after saving', async () => {
      const stateData = {
        currentStep: 2,
        profileData: {
          first_name: 'Integration',
          last_name: 'Test',
          timezone: 'UTC',
          language: 'en',
        },
      };

      // First save the state
      await api.patch('/api/v1/onboarding/state').send(stateData).expect(200);

      // Then retrieve it
      const res = await api.get('/api/v1/onboarding/state').expect(200);

      expect(res.body).toHaveProperty('currentStep', 2);
      expect(res.body).toHaveProperty('profileData');
    });
  });

  describe('PATCH /api/v1/onboarding/state', () => {
    it('should save onboarding state', async () => {
      const stateData = {
        currentStep: 1,
        profileData: {
          first_name: 'Test',
          last_name: 'User',
          phone: '+1234567890',
          timezone: 'UTC',
          language: 'en',
        },
      };

      const res = await api.patch('/api/v1/onboarding/state').send(stateData).expect(200);

      expect(res.body).toHaveProperty('currentStep', 1);
      expect(res.body).toHaveProperty('version', 2);
    });

    it('should validate state data - reject invalid currentStep type', async () => {
      const invalidData = {
        currentStep: 'not-a-number' as any,
      };

      await api.patch('/api/v1/onboarding/state').send(invalidData).expect(400);
    });
  });

  describe('DELETE /api/v1/onboarding/state', () => {
    it('should clear onboarding state', async () => {
      // First save some state
      await api
        .patch('/api/v1/onboarding/state')
        .send({ currentStep: 3 })
        .expect(200);

      // Then clear it
      await api.delete('/api/v1/onboarding/state').expect(200);

      // Verify it's cleared
      const res = await api.get('/api/v1/onboarding/state').expect(200);
      expect(res.body).toBeNull();
    });
  });

  describe('POST /api/v1/onboarding/profile (Step 1)', () => {
    it('should save user profile', async () => {
      const profileData = {
        first_name: 'Integration',
        last_name: 'Test User',
        phone: '+212600000000',
        timezone: 'Africa/Casablanca',
        language: 'fr',
      };

      await api.post('/api/v1/onboarding/profile').send(profileData).expect(201);
    });

    it('should reject profile with missing required fields', async () => {
      const invalidProfile = {
        first_name: 'Test',
        // missing last_name, timezone, language
      };

      await api.post('/api/v1/onboarding/profile').send(invalidProfile).expect(400);
    });

    it('should accept profile without optional phone field', async () => {
      const profileData = {
        first_name: 'No',
        last_name: 'Phone',
        timezone: 'UTC',
        language: 'en',
      };

      await api.post('/api/v1/onboarding/profile').send(profileData).expect(201);
    });
  });

  describe('POST /api/v1/onboarding/organization (Step 2)', () => {
    let organizationId: string;

    it('should create a new organization', async () => {
      const orgData = {
        name: `Integration Test Farm ${Date.now()}`,
        slug: `integration-test-farm-${Date.now()}`,
        phone: '+212600000000',
        email: `integration-${Date.now()}@test.com`,
        account_type: 'business' as const,
        address: '123 Test Street',
        city: 'Casablanca',
        country: 'Morocco',
      };

      const res = await api.post('/api/v1/onboarding/organization').send(orgData).expect(201);

      expect(res.body).toHaveProperty('id');
      organizationId = res.body.id;
    });

    it('should reject organization with invalid account_type', async () => {
      const invalidOrg = {
        name: 'Invalid Org',
        slug: `invalid-org-${Date.now()}`,
        email: 'invalid@test.com',
        account_type: 'invalid-type' as any,
        country: 'Morocco',
      };

      await api.post('/api/v1/onboarding/organization').send(invalidOrg).expect(400);
    });

    it('should update existing organization via PATCH', async () => {
      // First create an org
      const createRes = await api
        .post('/api/v1/onboarding/organization')
        .send({
          name: `Update Test ${Date.now()}`,
          slug: `update-test-${Date.now()}`,
          email: `update-${Date.now()}@test.com`,
          account_type: 'individual' as const,
          country: 'Morocco',
        })
        .expect(201);

      const orgId = createRes.body.id;

      // Then update it
      const updateData = {
        name: 'Updated Organization',
        slug: `updated-org-${Date.now()}`,
        email: `updated-${Date.now()}@test.com`,
        account_type: 'farm' as const,
        country: 'Morocco',
      };

      const res = await api
        .patch(`/api/v1/onboarding/organization/${orgId}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('id', orgId);
    });
  });

  describe('POST /api/v1/onboarding/farm (Step 3)', () => {
    let organizationId: string;

    beforeAll(async () => {
      // Create an organization first for farm tests
      const orgData = {
        name: `Farm Test Org ${Date.now()}`,
        slug: `farm-test-org-${Date.now()}`,
        email: `farm-org-${Date.now()}@test.com`,
        account_type: 'business' as const,
        country: 'Morocco',
      };

      const res = await api.post('/api/v1/onboarding/organization').send(orgData).expect(201);
      organizationId = res.body.id;
    });

    it('should create a farm', async () => {
      const farmData = {
        name: `Integration Test Farm ${Date.now()}`,
        location: 'Casablanca Province, Morocco',
        size: 50,
        size_unit: 'hectares',
        farm_type: 'main' as const,
        description: 'Test farm for integration testing',
        soil_type: 'Clay Loam',
        climate_zone: 'Mediterranean',
      };

      const res = await api.post('/api/v1/onboarding/farm').send(farmData).expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should reject farm with invalid size type', async () => {
      const invalidFarm = {
        name: 'Invalid Farm',
        location: 'Somewhere',
        size: 'not-a-number' as any,
        size_unit: 'hectares',
        farm_type: 'main' as const,
      };

      await api.post('/api/v1/onboarding/farm').send(invalidFarm).expect(400);
    });
  });

  describe('POST /api/v1/onboarding/modules (Step 4)', () => {
    it('should save selected modules', async () => {
      const modulesData = {
        moduleSelection: {
          farm_management: true,
          inventory: true,
          sales: false,
          procurement: false,
          accounting: true,
          hr: false,
          analytics: true,
          marketplace: false,
        },
      };

      await api.post('/api/v1/onboarding/modules').send(modulesData).expect(201);
    });

    it('should reject modules with invalid structure', async () => {
      // The validation pipe should reject non-boolean values
      const invalidModules = {
        moduleSelection: {
          farm_management: 'yes' as any,
        },
      };

      await api.post('/api/v1/onboarding/modules').send(invalidModules).expect(400);
    });
  });

  describe('POST /api/v1/onboarding/complete (Step 5)', () => {
    it('should complete onboarding with preferences', async () => {
      const preferencesData = {
        currency: 'MAD',
        date_format: 'DD/MM/YYYY',
        use_demo_data: false,
        enable_notifications: true,
      };

      await api.post('/api/v1/onboarding/complete').send(preferencesData).expect(201);
    });

    it('should reject completion with invalid data types', async () => {
      const invalidPreferences = {
        currency: 'MAD',
        date_format: 'DD/MM/YYYY',
        use_demo_data: 'not-a-boolean' as any,
        enable_notifications: 'not-a-boolean' as any,
      };

      await api.post('/api/v1/onboarding/complete').send(invalidPreferences).expect(400);
    });

    it('should verify user profile is marked as onboarded', async () => {
      // Complete onboarding
      await api
        .post('/api/v1/onboarding/complete')
        .send({
          currency: 'MAD',
          date_format: 'DD/MM/YYYY',
          use_demo_data: false,
          enable_notifications: true,
        })
        .expect(201);

      // Check the user profile
      const client = db.getAdminClient();
      const { data } = await client
        .from('user_profiles')
        .select('onboarding_completed, onboarding_completed_at')
        .eq('id', testUserId)
        .single();

      expect(data?.onboarding_completed).toBe(true);
      expect(data?.onboarding_completed_at).not.toBeNull();
    });
  });

  describe('Complete Onboarding Flow', () => {
    it('should run through complete onboarding flow end-to-end', async () => {
      const flowUserId = generateTestId();

      // Create test user
      const client = db.getAdminClient();
      await client.from('user_profiles').insert({
        id: flowUserId,
        email: `flow-${generateTestId()}@test.com`,
        first_name: 'Flow',
        last_name: 'Test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Step 1: Save profile
      await api.patch('/api/v1/onboarding/state').send({
        currentStep: 1,
      });

      await api
        .post('/api/v1/onboarding/profile')
        .send({
          first_name: 'Flow',
          last_name: 'Test',
          timezone: 'UTC',
          language: 'en',
        })
        .expect(201);

      // Step 2: Create organization
      const orgRes = await api
        .post('/api/v1/onboarding/organization')
        .send({
          name: `Flow Test Org ${Date.now()}`,
          slug: `flow-org-${Date.now()}`,
          email: `flow-${Date.now()}@test.com`,
          account_type: 'business' as const,
          country: 'Morocco',
        })
        .expect(201);

      // Step 3: Create farm
      await api
        .post('/api/v1/onboarding/farm')
        .send({
          name: `Flow Farm ${Date.now()}`,
          location: 'Test Location',
          size: 100,
          size_unit: 'hectares',
          farm_type: 'main' as const,
        })
        .expect(201);

      // Step 4: Select modules
      await api
        .post('/api/v1/onboarding/modules')
        .send({
          moduleSelection: {
            farm_management: true,
            accounting: true,
          },
        })
        .expect(201);

      // Step 5: Complete
      await api
        .post('/api/v1/onboarding/complete')
        .send({
          currency: 'MAD',
          date_format: 'DD/MM/YYYY',
          use_demo_data: false,
          enable_notifications: true,
        })
        .expect(201);

      // Cleanup
      await client.from('user_profiles').delete().eq('id', flowUserId);
    });
  });
});
