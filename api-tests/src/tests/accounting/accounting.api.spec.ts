import { test, expect } from '../../fixtures/auth.fixture';
import { testData } from '../../helpers/test-data';

test.describe('Accounts API @accounting @smoke', () => {
  test('GET /accounts - should list chart of accounts', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/accounts');

    expect(response.status()).toBe(200);
  });

  test('POST /accounts - should create an account', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/accounts', {
      data: testData.account(),
    });

    expect([200, 201]).toContain(response.status());
  });

  test('GET /accounts - should reject unauthenticated', async ({ request }) => {
    const response = await request.get('/api/v1/accounts');

    expect(response.status()).toBe(401);
  });
});

test.describe('Fiscal Years API @accounting @smoke', () => {
  test('GET /fiscal-years - should list fiscal years', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/fiscal-years');

    expect(response.status()).toBe(200);
  });
});

test.describe('Invoices API @accounting @smoke', () => {
  test('GET /invoices - should list invoices', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/invoices');

    expect(response.status()).toBe(200);
  });

  test('POST /invoices - should reject invoice without customer', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/invoices', {
      data: {
        invoice_date: new Date().toISOString().split('T')[0],
        items: [],
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Payments API @accounting @smoke', () => {
  test('GET /payments - should list payments', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/payments');

    expect(response.status()).toBe(200);
  });
});

test.describe('Journal Entries API @accounting', () => {
  test('GET /journal-entries - should list journal entries', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/journal-entries');

    expect(response.status()).toBe(200);
  });
});

test.describe('Quotes API @accounting', () => {
  test('GET /quotes - should list quotes', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/quotes');

    expect(response.status()).toBe(200);
  });
});

test.describe('Purchase Orders API @accounting', () => {
  test('GET /purchase-orders - should list purchase orders', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/purchase-orders');

    expect(response.status()).toBe(200);
  });
});

test.describe('Sales Orders API @accounting', () => {
  test('GET /sales-orders - should list sales orders', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/sales-orders');

    expect(response.status()).toBe(200);
  });
});

test.describe('Taxes API @accounting', () => {
  test('GET /taxes - should list taxes', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/taxes');

    expect(response.status()).toBe(200);
  });
});

test.describe('Cost Centers API @accounting', () => {
  test('GET /cost-centers - should list cost centers', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/cost-centers');

    expect(response.status()).toBe(200);
  });
});

test.describe('Bank Accounts API @accounting', () => {
  test('GET /bank-accounts - should list bank accounts', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/bank-accounts');

    expect(response.status()).toBe(200);
  });
});

test.describe('Financial Reports API @accounting', () => {
  test('GET /financial-reports/trial-balance - should return trial balance', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/financial-reports/trial-balance');

    expect([200, 400]).toContain(response.status());
  });
});

test.describe('Account Mappings API @accounting', () => {
  test('GET /account-mappings - should list account mappings', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/account-mappings');

    expect(response.status()).toBe(200);
  });
});

test.describe('Sequences API @accounting', () => {
  test('GET /sequences - should list sequences', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/sequences');

    expect(response.status()).toBe(200);
  });
});

test.describe('Payment Records API @accounting', () => {
  test('GET /payment-records - should list payment records', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/payment-records');

    expect(response.status()).toBe(200);
  });
});
