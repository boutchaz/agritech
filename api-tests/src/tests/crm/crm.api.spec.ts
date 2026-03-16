import { test, expect } from '../../fixtures/auth.fixture';
import { testData } from '../../helpers/test-data';

test.describe('Customers API @crm @smoke', () => {
  let createdCustomerId: string;

  test('GET /customers - should list customers', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/customers');

    expect(response.status()).toBe(200);
  });

  test('POST /customers - should create a customer', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/customers', {
      data: testData.customer(),
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    if (body.id) createdCustomerId = body.id;
  });

  test('GET /customers/:id - should get customer by id', async ({ authedRequest }) => {
    if (!createdCustomerId) test.skip();

    const response = await authedRequest.get(`/api/v1/customers/${createdCustomerId}`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(createdCustomerId);
  });

  test('PATCH /customers/:id - should update a customer', async ({ authedRequest }) => {
    if (!createdCustomerId) test.skip();

    const response = await authedRequest.patch(`/api/v1/customers/${createdCustomerId}`, {
      data: { name: `Updated Customer ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('GET /customers?search - should filter customers', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/customers?search=test');

    expect(response.status()).toBe(200);
  });

  test('DELETE /customers/:id - should delete a customer', async ({ authedRequest }) => {
    if (!createdCustomerId) test.skip();

    const response = await authedRequest.delete(`/api/v1/customers/${createdCustomerId}`);

    expect([200, 204]).toContain(response.status());
  });
});

test.describe('Suppliers API @crm @smoke', () => {
  let createdSupplierId: string;

  test('GET /suppliers - should list suppliers', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/suppliers');

    expect(response.status()).toBe(200);
  });

  test('POST /suppliers - should create a supplier', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/suppliers', {
      data: testData.supplier(),
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    if (body.id) createdSupplierId = body.id;
  });

  test('GET /suppliers/:id - should get supplier by id', async ({ authedRequest }) => {
    if (!createdSupplierId) test.skip();

    const response = await authedRequest.get(`/api/v1/suppliers/${createdSupplierId}`);

    expect(response.status()).toBe(200);
  });

  test('PATCH /suppliers/:id - should update a supplier', async ({ authedRequest }) => {
    if (!createdSupplierId) test.skip();

    const response = await authedRequest.patch(`/api/v1/suppliers/${createdSupplierId}`, {
      data: { name: `Updated Supplier ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /suppliers/:id - should delete a supplier', async ({ authedRequest }) => {
    if (!createdSupplierId) test.skip();

    const response = await authedRequest.delete(`/api/v1/suppliers/${createdSupplierId}`);

    expect([200, 204]).toContain(response.status());
  });
});

test.describe('Dashboard API @crm @smoke', () => {
  test('GET /dashboard - should return dashboard data', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/dashboard');

    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Notifications API @crm', () => {
  test('GET /notifications - should list notifications', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/notifications');

    expect(response.status()).toBe(200);
  });
});

test.describe('Reports API @crm', () => {
  test('GET /reports - should list available reports', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reports');

    expect([200, 404]).toContain(response.status());
  });
});
