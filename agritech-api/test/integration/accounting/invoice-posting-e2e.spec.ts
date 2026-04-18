import { DatabaseService } from '../../../src/modules/database/database.service';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../../src/modules/casl/policies.guard';
import { OrganizationGuard } from '../../../src/common/guards/organization.guard';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

/**
 * E2E Invoice Posting Tests
 *
 * Full flow: create org → apply country template → create invoice → post invoice
 * → verify journal entry uses correct country-specific account codes.
 */
describe('Invoice Posting E2E - Country-Specific Account Resolution', () => {
  let app: INestApplication;
  let dbService: DatabaseService;
  let testUserId: string;
  let request: any;

  // Track created resources for cleanup
  const createdOrgIds: string[] = [];
  const createdAuthUserIds: string[] = [];

  // Mutable ref so closure always sees latest userId
  const userRef = { id: generateUUID() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: userRef.id, email: 'test@example.com', role: 'owner', sub: userRef.id };
          return true;
        },
      })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrganizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    dbService = moduleRef.get<DatabaseService>(DatabaseService);
    request = require('supertest');

    // Create a real auth user for FK constraints
    const supabase = dbService.getAdminClient();
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: `test-invoice-e2e-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (authError) throw new Error(`Failed to create auth user: ${authError.message}`);
    userRef.id = authUser.user.id;
    testUserId = userRef.id;
    createdAuthUserIds.push(testUserId);
  }, 120000);

  afterAll(async () => {
    const supabase = dbService.getAdminClient();

    // Clean up orgs and their data
    for (const orgId of createdOrgIds) {
      await supabase.from('journal_items').delete().eq('organization_id', orgId);
      await supabase.from('journal_entries').delete().eq('organization_id', orgId);
      await supabase.from('invoice_items').delete().eq('organization_id', orgId);
      await supabase.from('invoices').delete().eq('organization_id', orgId);
      await supabase.from('account_mappings').delete().eq('organization_id', orgId);
      await supabase.from('accounts').delete().eq('organization_id', orgId);
      await supabase.from('organizations').delete().eq('id', orgId);
    }

    // Clean up auth users
    for (const userId of createdAuthUserIds) {
      await supabase.auth.admin.deleteUser(userId);
    }

    if (app) await app.close();
  }, 30000);

  function get(url: string) { return request(app.getHttpServer()).get(url); }
  function post(url: string) { return request(app.getHttpServer()).post(url); }

  async function createTestOrg(name: string): Promise<string> {
    const supabase = dbService.getAdminClient();
    const orgId = generateUUID();

    const { error } = await supabase
      .from('organizations')
      .insert({ id: orgId, name, slug: `test-${orgId.substring(0, 8)}` });

    if (error) throw new Error(`Failed to create org: ${error.message}`);
    createdOrgIds.push(orgId);
    return orgId;
  }

  async function getJournalItems(journalEntryId: string) {
    const supabase = dbService.getAdminClient();
    const { data } = await supabase
      .from('journal_items')
      .select('*, account:accounts(code, name)')
      .eq('journal_entry_id', journalEntryId);
    return data || [];
  }

  // ── Morocco ──────────────────────────────────────────────────────

  describe('Morocco (MA) - Sales Invoice Posting', () => {
    let orgId: string;

    beforeAll(async () => {
      orgId = await createTestOrg('Test Farm Morocco E2E');

      // Apply MA template
      const res = await post('/api/v1/accounts/templates/MA/apply')
        .set('x-organization-id', orgId)
        .send({ overwrite: true, includeAccountMappings: true });

      expect(res.status).toBe(201);
      expect(res.body.accounts_created).toBeGreaterThan(0);
      expect(res.body.account_mappings_created).toBeGreaterThan(0);
    }, 60000);

    it('should post a sales invoice and create journal entry with Moroccan accounts (3420=AR, 7111=revenue)', async () => {
      // Create a sales invoice
      const createRes = await post('/api/v1/invoices')
        .set('x-organization-id', orgId)
        .send({
          invoice_type: 'sales',
          party_type: 'Customer',
          party_name: 'Client Test Maroc',
          invoice_date: '2025-06-01',
          due_date: '2025-07-01',
          subtotal: 1000,
          tax_total: 200,
          grand_total: 1200,
          outstanding_amount: 1200,
          items: [{
            item_name: 'Olives Bio',
            description: 'Olives bio première pression',
            quantity: 100,
            unit_price: 10,
            amount: 1000,
            tax_amount: 200,
            line_total: 1200,
          }],
        });

      if (createRes.status !== 201) {
        console.error('MA Invoice creation failed (userId=' + userRef.id + '):', JSON.stringify(createRes.body, null, 2));
      }
      expect(createRes.status).toBe(201);
      const invoiceId = createRes.body.id;
      expect(invoiceId).toBeDefined();

      // Post the invoice
      const postRes = await post(`/api/v1/invoices/${invoiceId}/post`)
        .set('x-organization-id', orgId)
        .send({ posting_date: '2025-06-01' });

      if (postRes.status !== 200 && postRes.status !== 201) {
        console.error('MA Invoice posting failed:', JSON.stringify(postRes.body, null, 2));
      }
      expect([200, 201]).toContain(postRes.status);
      expect(postRes.body.data.journal_entry_id).toBeDefined();

      // Verify journal entry uses Moroccan CGNC account codes
      const journalItems = await getJournalItems(postRes.body.data.journal_entry_id);
      expect(journalItems.length).toBeGreaterThanOrEqual(2);

      const accountCodes = journalItems.map((item: any) => item.account?.code).filter(Boolean);

      // Moroccan CGNC codes:
      // 3420 = Clients (Trade Receivables)
      // 4457 = TVA collectée
      // 7111 = Ventes de marchandises (Revenue)
      expect(accountCodes).toContain('3420'); // AR
      expect(accountCodes).toContain('7111'); // Revenue

      // Verify double-entry is balanced
      const totalDebit = journalItems.reduce((sum: number, item: any) => sum + Number(item.debit || 0), 0);
      const totalCredit = journalItems.reduce((sum: number, item: any) => sum + Number(item.credit || 0), 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      // Verify amounts
      expect(totalDebit).toBeCloseTo(1200, 1); // grand_total
    }, 30000);
  });

  // ── France ───────────────────────────────────────────────────────

  describe('France (FR) - Sales Invoice Posting', () => {
    let orgId: string;

    beforeAll(async () => {
      orgId = await createTestOrg('Test Farm France E2E');

      // Apply FR template
      const res = await post('/api/v1/accounts/templates/FR/apply')
        .set('x-organization-id', orgId)
        .send({ overwrite: true, includeAccountMappings: true });

      expect(res.status).toBe(201);
      expect(res.body.accounts_created).toBeGreaterThan(0);
      expect(res.body.account_mappings_created).toBeGreaterThan(0);
    }, 60000);

    it('should post a sales invoice and create journal entry with French accounts (411=AR, 701=revenue)', async () => {
      // Create a sales invoice
      const createRes = await post('/api/v1/invoices')
        .set('x-organization-id', orgId)
        .send({
          invoice_type: 'sales',
          party_type: 'Customer',
          party_name: 'Client Test France',
          invoice_date: '2025-06-01',
          due_date: '2025-07-01',
          subtotal: 1000,
          tax_total: 200,
          grand_total: 1200,
          outstanding_amount: 1200,
          items: [{
            item_name: 'Blé Bio',
            description: 'Blé biologique récolte 2025',
            quantity: 100,
            unit_price: 10,
            amount: 1000,
            tax_amount: 200,
            line_total: 1200,
          }],
        });

      if (createRes.status !== 201) {
        console.error('FR Invoice creation failed:', JSON.stringify(createRes.body, null, 2));
      }
      expect(createRes.status).toBe(201);
      const invoiceId = createRes.body.id;
      expect(invoiceId).toBeDefined();

      // Post the invoice
      const postRes = await post(`/api/v1/invoices/${invoiceId}/post`)
        .set('x-organization-id', orgId)
        .send({ posting_date: '2025-06-01' });

      if (postRes.status !== 200 && postRes.status !== 201) {
        console.error('FR Invoice posting failed:', JSON.stringify(postRes.body, null, 2));
      }
      expect([200, 201]).toContain(postRes.status);
      expect(postRes.body.data.journal_entry_id).toBeDefined();

      // Verify journal entry uses French PCG account codes
      const journalItems = await getJournalItems(postRes.body.data.journal_entry_id);
      expect(journalItems.length).toBeGreaterThanOrEqual(2);

      const accountCodes = journalItems.map((item: any) => item.account?.code).filter(Boolean);

      // French PCG codes:
      // 411 = Clients (Trade Receivables)
      // 4437 = TVA collectée
      // 701 = Ventes de produits finis (Revenue)
      expect(accountCodes).toContain('411'); // AR
      expect(accountCodes).toContain('701'); // Revenue

      // Verify double-entry is balanced
      const totalDebit = journalItems.reduce((sum: number, item: any) => sum + Number(item.debit || 0), 0);
      const totalCredit = journalItems.reduce((sum: number, item: any) => sum + Number(item.credit || 0), 0);
      expect(Math.abs(totalDebit - totalCredit)).toBeLessThan(0.01);

      // Verify amounts
      expect(totalDebit).toBeCloseTo(1200, 1); // grand_total
    }, 30000);
  });
});
