import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Compliance API @compliance @smoke', () => {
  test('GET /compliance/certifications - should list certifications', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/compliance/certifications');

    expect(response.status()).toBe(200);
  });

  test('GET /compliance/checks - should list compliance checks', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/compliance/checks');

    expect(response.status()).toBe(200);
  });

  test('GET /compliance/requirements - should list compliance requirements', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/compliance/requirements');

    expect(response.status()).toBe(200);
  });

  test('GET /compliance/dashboard - should return compliance dashboard', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/compliance/dashboard');

    expect([200, 404]).toContain(response.status());
  });

  test('GET /compliance/corrective-actions - should list corrective actions', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/compliance/corrective-actions');

    expect(response.status()).toBe(200);
  });

  test('GET /compliance/corrective-actions/stats - should return corrective action stats', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/compliance/corrective-actions/stats');

    expect(response.status()).toBe(200);
  });
});

test.describe('Document Templates API @compliance', () => {
  test('GET /organizations/:orgId/document-templates - should list document templates', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/document-templates`);

    expect(response.status()).toBe(200);
  });
});
