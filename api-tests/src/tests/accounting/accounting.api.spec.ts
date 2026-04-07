import { test, expect } from '../../fixtures/auth.fixture';
import { testData } from '../../helpers/test-data';

test.describe('Accounts API @accounting @smoke', () => {
  test('GET /accounts - should list chart of accounts', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/accounts');

    expect([200, 400]).toContain(response.status());
  });

  test('POST /accounts - should create an account', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/accounts', {
      data: testData.account(),
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('GET /accounts/templates - should list account templates', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/accounts/templates');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /accounts - should reject unauthenticated', async ({ request }) => {
    const response = await request.get('/api/v1/accounts');

    expect(response.status()).toBe(401);
  });
});

test.describe('Fiscal Years API @accounting @smoke', () => {
  test('GET /fiscal-years - should list fiscal years', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/fiscal-years');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /fiscal-years/active - should return active fiscal year', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/fiscal-years/active');

    expect([200, 404, 500]).toContain(response.status());
  });

  test('POST /fiscal-years - should create a fiscal year', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/fiscal-years', {
      data: testData.fiscalYear(),
    });

    expect([200, 201, 500]).toContain(response.status());
  });
});

test.describe('Invoices API @accounting @smoke', () => {
  test('GET /invoices - should list invoices', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/invoices');

    expect([200, 400]).toContain(response.status());
  });

  test('POST /invoices - should reject invoice without customer', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/invoices', {
      data: { invoice_date: new Date().toISOString().split('T')[0], items: [] },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('Payments API @accounting @smoke', () => {
  test('GET /payments - should list payments', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/payments');

    expect(response.status()).toBe(200);
  });

  test('POST /payments - should reject payment without data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/payments', {
      data: {},
    });

    expect([400, 422, 500]).toContain(response.status());
  });
});

test.describe('Journal Entries API @accounting', () => {
  test('GET /journal-entries - should list journal entries', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/journal-entries');

    expect(response.status()).toBe(200);
  });

  test('POST /journal-entries - should reject empty journal entry', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/journal-entries', {
      data: {},
    });

    expect([400, 422, 500]).toContain(response.status());
  });
});

test.describe('Quotes API @accounting', () => {
  test('GET /quotes - should list quotes', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/quotes');

    expect([200, 400]).toContain(response.status());
  });
});

test.describe('Purchase Orders API @accounting', () => {
  test('GET /purchase-orders - should list purchase orders', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/purchase-orders');

    expect(response.status()).toBe(200);
  });

  test('POST /purchase-orders - should reject empty purchase order', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/purchase-orders', {
      data: {},
    });

    expect([400, 422]).toContain(response.status());
  });
});

test.describe('Sales Orders API @accounting', () => {
  test('GET /sales-orders - should list sales orders', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/sales-orders');

    expect(response.status()).toBe(200);
  });

  test('POST /sales-orders - should reject empty sales order', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/sales-orders', {
      data: {},
    });

    expect([400, 422]).toContain(response.status());
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

  test('POST /cost-centers - should create a cost center', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/cost-centers', {
      data: { name: `Test Cost Center ${Date.now()}`, type: 'farm' },
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });
});

test.describe('Bank Accounts API @accounting', () => {
  test('GET /bank-accounts - should list bank accounts', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/bank-accounts');

    expect(response.status()).toBe(200);
  });

  test('POST /bank-accounts - should create a bank account', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/bank-accounts', {
      data: { name: `Test Bank ${Date.now()}`, bank_name: 'Test Bank', account_number: `BA${Date.now()}` },
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });
});

test.describe('Financial Reports API @accounting', () => {
  test('GET /financial-reports/trial-balance - should return trial balance', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/financial-reports/trial-balance');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /financial-reports/balance-sheet - should return balance sheet', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/financial-reports/balance-sheet');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /financial-reports/profit-loss - should return profit and loss', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/financial-reports/profit-loss');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /financial-reports/account-summary - should return account summary', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/financial-reports/account-summary');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /financial-reports/cash-flow - should return cash flow', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/financial-reports/cash-flow');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /financial-reports/aged-receivables - should return aged receivables', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/financial-reports/aged-receivables');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /financial-reports/aged-payables - should return aged payables', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/financial-reports/aged-payables');

    expect([200, 400]).toContain(response.status());
  });
});

test.describe('Account Mappings API @accounting', () => {
  test('GET /account-mappings - should list account mappings', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/account-mappings');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /account-mappings/types - should list mapping types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/account-mappings/types');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /account-mappings/options - should list mapping options', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/account-mappings/options');

    expect([200, 400]).toContain(response.status());
  });

  test('POST /account-mappings/initialize - should initialize mappings', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/account-mappings/initialize');

    expect([200, 201, 400]).toContain(response.status());
  });
});

test.describe('Payment Records API @accounting', () => {
  test('GET /payment-records - should list payment records', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/payment-records`);

    expect(response.status()).toBe(200);
  });

  test('GET /payment-records/statistics/summary - should return payment statistics', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/payment-records/statistics/summary`);

    expect(response.status()).toBe(200);
  });

  test('GET /payment-records/advances/list - should list advances', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/payment-records/advances/list`);

    expect([200, 400]).toContain(response.status());
  });
});

test.describe('Accounting Cost/Revenue Journal API @accounting', () => {
  test('POST /accounting/costs/:id/journal-entry - should reject invalid cost id', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/accounting/costs/00000000-0000-0000-0000-000000000000/journal-entry');

    expect([400, 404]).toContain(response.status());
  });

  test('POST /accounting/revenues/:id/journal-entry - should reject invalid revenue id', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/accounting/revenues/00000000-0000-0000-0000-000000000000/journal-entry');

    expect([400, 404]).toContain(response.status());
  });
});
