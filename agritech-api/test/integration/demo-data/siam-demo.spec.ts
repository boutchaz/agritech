import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';
import { DatabaseService } from '../../../src/modules/database/database.service';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_EMAIL = 'siam-integration@example.com';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
};

describe('SIAM Demo Data API', () => {
  let api: ApiIntegrationTestHelper;
  let databaseService: DatabaseService;
  let organizationId: string;

  const setupOrganization = async () => {
    const client = databaseService.getAdminClient();

    const { data: existingUser } = await client.auth.admin.getUserById(TEST_USER_ID);
    if (!existingUser?.user) {
      const { error: userError } = await client.auth.admin.createUser({
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        password: 'Password123!',
        email_confirm: true,
      });

      expect(userError).toBeNull();
    }

    const { data: role, error: roleError } = await client
      .from('roles')
      .select('id')
      .eq('name', 'organization_admin')
      .single();

    expect(roleError).toBeNull();
    expect(role?.id).toBeTruthy();

    const { error: organizationError } = await client.from('organizations').insert({
      id: organizationId,
      name: `SIAM Demo Org ${Date.now()}`,
      slug: `siam-demo-${organizationId.slice(0, 8)}`,
      email: `siam-${organizationId.slice(0, 8)}@example.com`,
      country: 'Maroc',
      account_type: 'farm',
      is_active: true,
    });

    expect(organizationError).toBeNull();

    const { error: membershipError } = await client
      .from('organization_users')
      .insert({
        organization_id: organizationId,
        user_id: TEST_USER_ID,
        role_id: role!.id,
        is_active: true,
      });

    expect(membershipError).toBeNull();
  };

  beforeAll(async () => {
    api = await setupRealApiIntegration(TEST_USER_ID, TEST_USER_EMAIL);
    databaseService = api.getService<DatabaseService>(DatabaseService);
  }, 60000);

  beforeEach(async () => {
    organizationId = generateUUID();
    await setupOrganization();
  });

  afterEach(async () => {
    const client = databaseService.getAdminClient();
    await client.from('organization_users').delete().eq('organization_id', organizationId);
    await client.from('organizations').delete().eq('id', organizationId);
  });

  afterAll(async () => {
    const client = databaseService.getAdminClient();
    await client.auth.admin.deleteUser(TEST_USER_ID);
    await api.cleanup();
  });

  it('seeds SIAM farms, parcels, calibrations, recommendations, harvest records, and analyses', async () => {
    const seedResponse = await api
      .post(`/api/v1/organizations/${organizationId}/demo-data/seed-siam`)
      .set('x-organization-id', organizationId)
      .send({});

    expect(seedResponse.status).toBe(201);
    expect(seedResponse.body.message).toBe('SIAM demo data seeded successfully');

    const client = databaseService.getAdminClient();

    const { data: farms, error: farmsError } = await client
      .from('farms')
      .select('id, name, size')
      .eq('organization_id', organizationId)
      .in('name', ['Ferme Atlas', 'Ferme Ziz', 'Ferme Rif']);

    expect(farmsError).toBeNull();
    expect(farms).toHaveLength(3);
    const totalFarmArea = (farms ?? []).reduce(
      (sum, farm) => sum + Number(farm.size ?? 0),
      0,
    );
    expect(totalFarmArea).toBeCloseTo(320, 0);

    const { data: parcels, error: parcelsError } = await client
      .from('parcels')
      .select('id, name, crop_type, variety, planting_year, planting_system, area, boundary, farm_id')
      .eq('organization_id', organizationId);

    expect(parcelsError).toBeNull();
    expect((parcels ?? []).length).toBeGreaterThanOrEqual(15);

    const oliveParcels = (parcels ?? []).filter((parcel) => parcel.crop_type === 'olivier');
    expect(oliveParcels.length).toBeGreaterThanOrEqual(10);

    const meknèsParcels = (parcels ?? []).filter((parcel) => {
      const boundary = parcel.boundary as [number, number][] | null;
      const firstPoint = boundary?.[0];
      if (!firstPoint) return false;
      const [lon, lat] = firstPoint;
      return lat >= 33.8 && lat <= 33.95 && lon >= -5.6 && lon <= -5.45;
    });
    expect(meknèsParcels.length).toBeGreaterThanOrEqual(2);

    const { data: calibrations, error: calibrationsError } = await client
      .from('calibrations')
      .select('id, parcel_id, status, scores_detail, health_score, confidence_score, phase_age')
      .eq('organization_id', organizationId);

    expect(calibrationsError).toBeNull();
    expect((calibrations ?? []).length).toBeGreaterThanOrEqual(5);
    expect(
      (calibrations ?? []).some(
        (calibration) => calibration.status === 'validated' && calibration.scores_detail,
      ),
    ).toBe(true);

    const { data: recommendations, error: recommendationsError } = await client
      .from('ai_recommendations')
      .select('id, parcel_id, type, priority, status, bloc_3_action')
      .eq('organization_id', organizationId);

    expect(recommendationsError).toBeNull();
    expect((recommendations ?? []).length).toBeGreaterThanOrEqual(5);
    expect(
      (recommendations ?? []).some((recommendation) => {
        const action = recommendation.bloc_3_action as { description?: string } | null;
        return action?.description?.includes('Arrosez') || false;
      }),
    ).toBe(true);

    const { data: harvestRecords, error: harvestError } = await client
      .from('harvest_records')
      .select('id, parcel_id, harvest_date, quantity, unit, quality_grade')
      .eq('organization_id', organizationId);

    expect(harvestError).toBeNull();
    expect((harvestRecords ?? []).length).toBeGreaterThanOrEqual(10);
    const harvestYears = new Set(
      (harvestRecords ?? []).map((record) => new Date(record.harvest_date).getFullYear()),
    );
    expect(harvestYears.size).toBeGreaterThanOrEqual(2);

    const { data: analyses, error: analysesError } = await client
      .from('analyses')
      .select('id, parcel_id, analysis_type')
      .eq('organization_id', organizationId);

    expect(analysesError).toBeNull();
    expect((analyses ?? []).length).toBeGreaterThanOrEqual(3);
    expect(
      (analyses ?? []).filter((analysis) =>
        ['soil', 'water'].includes(String(analysis.analysis_type)),
      ).length,
    ).toBeGreaterThanOrEqual(3);

    const statsResponse = await api
      .get(`/api/v1/organizations/${organizationId}/demo-data/stats`)
      .set('x-organization-id', organizationId);

    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.stats.farms).toBe(3);
    expect(statsResponse.body.stats.parcels).toBeGreaterThanOrEqual(15);
    expect(statsResponse.body.stats.calibrations).toBeGreaterThanOrEqual(5);
    expect(statsResponse.body.stats.ai_recommendations).toBeGreaterThanOrEqual(5);
    expect(statsResponse.body.stats.harvest_records).toBeGreaterThanOrEqual(10);
    expect(statsResponse.body.stats.analyses).toBeGreaterThanOrEqual(3);
  }, 120000);

  it('clears SIAM demo data', async () => {
    const seedResponse = await api
      .post(`/api/v1/organizations/${organizationId}/demo-data/seed-siam`)
      .set('x-organization-id', organizationId)
      .send({});

    expect(seedResponse.status).toBe(201);

    const clearResponse = await api
      .delete(`/api/v1/organizations/${organizationId}/demo-data/clear`)
      .set('x-organization-id', organizationId);

    expect(clearResponse.status).toBe(200);

    const statsResponse = await api
      .get(`/api/v1/organizations/${organizationId}/demo-data/stats`)
      .set('x-organization-id', organizationId);

    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.stats.farms).toBe(0);
    expect(statsResponse.body.stats.parcels).toBe(0);
    expect(statsResponse.body.stats.calibrations).toBe(0);
    expect(statsResponse.body.stats.ai_recommendations).toBe(0);
    expect(statsResponse.body.stats.harvest_records).toBe(0);
    expect(statsResponse.body.stats.analyses).toBe(0);
  }, 120000);
});
