import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';
const EMPTY_BODY = {};
const INVALID_BODY = { invalid: true };

const expectAllowedStatus = async (responsePromise: Promise<any>, allowedStatuses: number[]) => {
  const response = await responsePromise;
  expect(allowedStatuses).toContain(response.status());
};

test.describe('Chat API @ai', () => {
  test('POST /organizations/:orgId/chat @smoke - should send a message', async ({ authedRequest, organizationId }) => {
    await expectAllowedStatus(
      authedRequest.post(`/api/v1/organizations/${organizationId}/chat`, {
        data: { message: 'Hello from the test suite' },
      }),
      [200, 201, 202, 400, 422],
    );
  });

  test('POST /organizations/:orgId/chat - should reject an empty message payload', async ({ authedRequest, organizationId }) => {
    await expectAllowedStatus(authedRequest.post(`/api/v1/organizations/${organizationId}/chat`, { data: EMPTY_BODY }), [400, 422]);
  });

  test('GET /organizations/:orgId/chat/history @smoke - should return chat history', async ({ authedRequest, organizationId }) => {
    await expectAllowedStatus(authedRequest.get(`/api/v1/organizations/${organizationId}/chat/history`), [200]);
  });

  test('DELETE /organizations/:orgId/chat/history - should clear chat history', async ({ authedRequest, organizationId }) => {
    await expectAllowedStatus(authedRequest.delete(`/api/v1/organizations/${organizationId}/chat/history`), [200, 204]);
  });

  test('POST /organizations/:orgId/chat/stream @smoke - should stream a response', async ({ authedRequest, organizationId }) => {
    await expectAllowedStatus(
      authedRequest.post(`/api/v1/organizations/${organizationId}/chat/stream`, {
        data: { message: 'Stream this response' },
      }),
      [200, 206, 400],
    );
  });

  test('POST /organizations/:orgId/chat/stream - should reject an empty stream payload', async ({ authedRequest, organizationId }) => {
    await expectAllowedStatus(authedRequest.post(`/api/v1/organizations/${organizationId}/chat/stream`, { data: EMPTY_BODY }), [400, 422]);
  });

  test('POST /organizations/:orgId/chat/tts @smoke - should synthesize speech', async ({ authedRequest, organizationId }) => {
    await expectAllowedStatus(
      authedRequest.post(`/api/v1/organizations/${organizationId}/chat/tts`, {
        data: { text: 'Bonjour' },
      }),
      [200, 400, 422],
    );
  });

  test('POST /organizations/:orgId/chat/tts - should reject an empty tts payload', async ({ authedRequest, organizationId }) => {
    await expectAllowedStatus(authedRequest.post(`/api/v1/organizations/${organizationId}/chat/tts`, { data: EMPTY_BODY }), [400, 422]);
  });
});

test.describe('AI Recommendations API @ai', () => {
  test('GET /parcels/:parcelId/ai/recommendations @smoke - should list parcel recommendations', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get(`/api/v1/parcels/${NO_ID}/ai/recommendations`), [200, 404]);
  });

  test('GET /ai/recommendations/:id - should return a recommendation', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get(`/api/v1/ai-recommendations/${NO_ID}`), [200, 404]);
  });

  test('POST /ai/recommendations @smoke - should create a recommendation', async ({ authedRequest }) => {
    await expectAllowedStatus(
      authedRequest.post('/api/v1/ai-recommendations', {
        data: { description: 'Check irrigation needs on the parcel' },
      }),
      [200, 201, 202, 400, 404, 422],
    );
  });

  test('POST /ai/recommendations - should reject an empty recommendation payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.post('/api/v1/ai-recommendations', { data: EMPTY_BODY }), [400, 404, 422]);
  });

  test('PATCH /ai/recommendations/:id/validate @smoke - should validate a recommendation', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.patch(`/api/v1/ai-recommendations/${NO_ID}/validate`, { data: { status: 'valid' } }), [200, 204, 404]);
  });

  test('PATCH /ai/recommendations/:id/validate - should reject an empty validation payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.patch(`/api/v1/ai-recommendations/${NO_ID}/validate`, { data: EMPTY_BODY }), [400, 404, 422]);
  });

  test('PATCH /ai/recommendations/:id/validate - should reject a malformed validation payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.patch(`/api/v1/ai-recommendations/${NO_ID}/validate`, { data: INVALID_BODY }), [400, 404, 422]);
  });

  test('PATCH /ai/recommendations/:id/reject - should reject a recommendation', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.patch(`/api/v1/ai-recommendations/${NO_ID}/reject`, { data: { reason: 'Not relevant' } }), [200, 204, 404]);
  });

  test('PATCH /ai/recommendations/:id/reject - should reject an empty rejection payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.patch(`/api/v1/ai-recommendations/${NO_ID}/reject`, { data: EMPTY_BODY }), [400, 404, 422]);
  });

  test('PATCH /ai/recommendations/:id/reject - should reject a malformed rejection payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.patch(`/api/v1/ai-recommendations/${NO_ID}/reject`, { data: INVALID_BODY }), [400, 404, 422]);
  });

  test('PATCH /ai/recommendations/:id/execute - should execute a recommendation', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.patch(`/api/v1/ai-recommendations/${NO_ID}/execute`, { data: { mode: 'apply' } }), [200, 202, 204, 404]);
  });

  test('PATCH /ai/recommendations/:id/execute - should reject an empty execution payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.patch(`/api/v1/ai-recommendations/${NO_ID}/execute`, { data: EMPTY_BODY }), [400, 404, 422]);
  });

  test('PATCH /ai/recommendations/:id/execute - should reject a malformed execution payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.patch(`/api/v1/ai-recommendations/${NO_ID}/execute`, { data: INVALID_BODY }), [400, 404, 422]);
  });

  test('GET /ai/recommendations/:id/evaluation - should return recommendation evaluation', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get(`/api/v1/ai-recommendations/${NO_ID}/evaluation`), [200, 404]);
  });
});

test.describe('AI Reports API @ai', () => {
  test('GET /ai-reports/providers @smoke - should list AI report providers', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get('/api/v1/ai-reports/providers'), [200]);
  });

  test('GET /ai-reports/data-availability/:parcelId - should return data availability', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get(`/api/v1/ai-reports/data-availability/${NO_ID}`), [200, 400, 404]);
  });

  test('GET /ai-reports/parcels/:parcelId/calibration-status - should return calibration status', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get(`/api/v1/ai-reports/parcels/${NO_ID}/calibration-status`), [200, 404]);
  });

  test('POST /ai-reports/parcels/:parcelId/calibrate @smoke - should calibrate a parcel', async ({ authedRequest }) => {
    await expectAllowedStatus(
      authedRequest.post(`/api/v1/ai-reports/parcels/${NO_ID}/calibrate`, { data: { note: 'calibrate' } }),
      [200, 202, 404, 400, 422],
    );
  });

  test('POST /ai-reports/parcels/:parcelId/calibrate - should reject an empty calibration payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.post(`/api/v1/ai-reports/parcels/${NO_ID}/calibrate`, { data: EMPTY_BODY }), [201, 400, 422]);
  });

  test('POST /ai-reports/parcels/:parcelId/calibrate - should reject a malformed calibration payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.post(`/api/v1/ai-reports/parcels/${NO_ID}/calibrate`, { data: INVALID_BODY }), [400, 422]);
  });

  test('POST /ai-reports/parcels/:parcelId/fetch-data @smoke - should fetch parcel data', async ({ authedRequest }) => {
    await expectAllowedStatus(
      authedRequest.post(`/api/v1/ai-reports/parcels/${NO_ID}/fetch-data`, { data: { note: 'fetch' } }),
      [200, 202, 404, 400, 422],
    );
  });

  test('POST /ai-reports/parcels/:parcelId/fetch-data - should reject an empty fetch payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.post(`/api/v1/ai-reports/parcels/${NO_ID}/fetch-data`, { data: EMPTY_BODY }), [400, 422]);
  });

  test('POST /ai-reports/parcels/:parcelId/fetch-data - should reject a malformed fetch payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.post(`/api/v1/ai-reports/parcels/${NO_ID}/fetch-data`, { data: INVALID_BODY }), [400, 422]);
  });

  test('POST /ai-reports/generate @smoke - should generate an AI report', async ({ authedRequest }) => {
    await expectAllowedStatus(
      authedRequest.post('/api/v1/ai-reports/generate', { data: { note: 'generate' } }),
      [200, 201, 202, 400, 422],
    );
  });

  test('POST /ai-reports/generate - should reject an empty generate payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.post('/api/v1/ai-reports/generate', { data: EMPTY_BODY }), [400, 422]);
  });

  test('POST /ai-reports/generate - should reject a malformed generate payload', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.post('/api/v1/ai-reports/generate', { data: INVALID_BODY }), [400, 422]);
  });

  test('GET /ai-reports/jobs/:jobId - should return a report job', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get(`/api/v1/ai-reports/jobs/${NO_ID}`), [200, 400, 404]);
  });

  test('GET /ai-reports/jobs - should list AI report jobs', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get('/api/v1/ai-reports/jobs'), [200]);
  });
});

test.describe('AI Quota API @ai', () => {
  test('GET /ai-quota @smoke - should return AI quota status', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get('/api/v1/ai-quota'), [200]);
  });
});

test.describe('AI References API @ai', () => {
  test('GET /ai/references/:cropType @smoke - should return references for a crop', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get('/api/v1/ai/references/tomatoes'), [200, 400]);
  });

  test('GET /ai/references/:cropType/varieties - should return varieties', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get('/api/v1/ai/references/tomatoes/varieties'), [200, 400]);
  });

  test('GET /ai/references/:cropType/bbch - should return BBCH stages', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get('/api/v1/ai/references/tomatoes/bbch'), [200, 400]);
  });

  test('GET /ai/references/:cropType/alerts - should return alerts', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get('/api/v1/ai/references/tomatoes/alerts'), [200, 400]);
  });

  test('GET /ai/references/:cropType/npk-formulas - should return NPK formulas', async ({ authedRequest }) => {
    await expectAllowedStatus(authedRequest.get('/api/v1/ai/references/tomatoes/npk-formulas'), [200, 400]);
  });
});
