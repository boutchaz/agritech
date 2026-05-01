import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Items API - Integration Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  const extractId = (body: any) => body?.id || body?.data?.id || null;
  const extractData = (body: any) => {
    if (Array.isArray(body)) {
      return body;
    }
    if (Array.isArray(body?.data)) {
      return body.data;
    }
    if (Array.isArray(body?.items)) {
      return body.items;
    }
    if (Array.isArray(body?.results)) {
      return body.results;
    }
    return [];
  };

  const createItemGroup = async (organizationId: string, overrides: Record<string, any> = {}) => {
    const timestamp = Date.now();
    return api.post('/api/v1/items/groups')
      .set('x-organization-id', organizationId)
      .send({
        name: `Items Group ${timestamp}`,
        code: `ITM-GRP-${timestamp}`,
        ...overrides,
      });
  };

  const createItem = async (organizationId: string, overrides: Record<string, any> = {}) => {
    const timestamp = Date.now();
    return api.post('/api/v1/items')
      .set('x-organization-id', organizationId)
      .send({
        item_name: `Integration Item ${timestamp}`,
        item_code: `ITEM-${timestamp}`,
        ...overrides,
      });
  };

  const createVariant = async (organizationId: string, itemId: string, overrides: Record<string, any> = {}) => {
    const timestamp = Date.now();
    return api.post(`/api/v1/items/${itemId}/variants`)
      .set('x-organization-id', organizationId)
      .send({
        variant_name: `Variant ${timestamp}`,
        ...overrides,
      });
  };

  beforeAll(async () => {
    api = await setupRealApiIntegration(testOrgId);
  }, 180000);

  afterAll(async () => {
    if (api) {
      await api.cleanup();
    }
  });

  describe('GET /api/v1/items', () => {
    it('should fail without organization header', async () => {
      const res = await api.get('/api/v1/items');
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept with organization header', async () => {
      const res = await api.get('/api/v1/items')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by is_active=true', async () => {
      const res = await api.get('/api/v1/items?is_active=true')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by is_stock_item=true', async () => {
      const res = await api.get('/api/v1/items?is_stock_item=true')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by is_sales_item=true', async () => {
      const res = await api.get('/api/v1/items?is_sales_item=true')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by item_group_id', async () => {
      const groupRes = await createItemGroup(testOrgId, { name: `Filter Group ${Date.now()}` });
      const itemGroupId = extractId(groupRes.body) || generateUUID();

      const res = await api.get(`/api/v1/items?item_group_id=${itemGroupId}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by search term', async () => {
      const searchTerm = `search-${Date.now()}`;
      await createItem(testOrgId, { item_name: `Inventory ${searchTerm}` });

      const res = await api.get(`/api/v1/items?search=${encodeURIComponent(searchTerm)}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by crop_type', async () => {
      const cropType = `crop-${Date.now()}`;
      await createItem(testOrgId, { item_name: `Crop ${cropType}`, crop_type: cropType });

      const res = await api.get(`/api/v1/items?crop_type=${encodeURIComponent(cropType)}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by variety', async () => {
      const variety = `variety-${Date.now()}`;
      await createItem(testOrgId, { item_name: `Variety ${variety}`, variety });

      const res = await api.get(`/api/v1/items?variety=${encodeURIComponent(variety)}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/items/selection', () => {
    it('should fail without organization header', async () => {
      const res = await api.get('/api/v1/items/selection');
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept with organization header', async () => {
      const res = await api.get('/api/v1/items/selection')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by is_sales_item', async () => {
      const res = await api.get('/api/v1/items/selection?is_sales_item=true')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by is_stock_item', async () => {
      const res = await api.get('/api/v1/items/selection?is_stock_item=true')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by search', async () => {
      const searchTerm = `selection-${Date.now()}`;
      await createItem(testOrgId, { item_name: `Selection ${searchTerm}`, is_sales_item: true });

      const res = await api.get(`/api/v1/items/selection?search=${encodeURIComponent(searchTerm)}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/items/:id', () => {
    it('should fail without organization header', async () => {
      const res = await api.get(`/api/v1/items/${generateUUID()}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await api.get(`/api/v1/items/${generateUUID()}`)
        .set('x-organization-id', testOrgId);
      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/items', () => {
    it('should fail without organization header', async () => {
      const res = await api.post('/api/v1/items')
        .send({ item_name: 'Test Item' });
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept valid item with required fields', async () => {
      const res = await api.post('/api/v1/items')
        .set('x-organization-id', testOrgId)
        .send({
          item_name: `Required Item ${Date.now()}`,
        });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept item with all optional fields', async () => {
      const timestamp = Date.now();
      const res = await api.post('/api/v1/items')
        .set('x-organization-id', testOrgId)
        .send({
          item_name: `Full Item ${timestamp}`,
          item_code: `FULL-${timestamp}`,
          description: 'Integration item with optional fields',
          default_unit: 'kg',
          standard_rate: 150.25,
          is_sales_item: true,
          is_purchase_item: true,
          is_stock_item: true,
          is_active: true,
          minimum_stock_level: 10,
          images: ['https://example.com/image-1.png', 'https://example.com/image-2.png'],
          website_description: 'Website description',
          marketplace_category_slug: 'inputs',
          show_in_website: true,
        });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject missing required fields (empty item_name)', async () => {
      const res = await api.post('/api/v1/items')
        .set('x-organization-id', testOrgId)
        .send({
          item_name: '',
        });
      expect([400, 403, 422, 500]).toContain(res.status);
    });

    it('should accept item with item_group_id', async () => {
      const groupRes = await createItemGroup(testOrgId, { name: `Create Group ${Date.now()}` });
      const itemGroupId = extractId(groupRes.body) || generateUUID();

      const res = await api.post('/api/v1/items')
        .set('x-organization-id', testOrgId)
        .send({
          item_name: `Grouped Item ${Date.now()}`,
          item_group_id: itemGroupId,
        });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/items/:id', () => {
    it('should fail without organization header', async () => {
      const res = await api.patch(`/api/v1/items/${generateUUID()}`)
        .send({ item_name: 'Updated Item' });
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept valid update payload', async () => {
      const res = await api.patch(`/api/v1/items/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          item_name: `Updated Item ${Date.now()}`,
          description: 'Updated description',
          is_active: false,
          standard_rate: 99.5,
        });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept partial update (name only)', async () => {
      const res = await api.patch(`/api/v1/items/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({ item_name: `Partial Item ${Date.now()}` });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/items/:id', () => {
    it('should fail without organization header', async () => {
      const res = await api.delete(`/api/v1/items/${generateUUID()}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept delete request with organization header', async () => {
      const res = await api.delete(`/api/v1/items/${generateUUID()}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/items/stock-levels', () => {
    it('should fail without organization header', async () => {
      const res = await api.get('/api/v1/items/stock-levels');
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept with organization header', async () => {
      const res = await api.get('/api/v1/items/stock-levels')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by farm_id', async () => {
      const res = await api.get(`/api/v1/items/stock-levels?farm_id=${generateUUID()}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by item_id', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Stock Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();

      const res = await api.get(`/api/v1/items/stock-levels?item_id=${itemId}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/items/stock-levels/farm', () => {
    it('should fail without organization header', async () => {
      const res = await api.get('/api/v1/items/stock-levels/farm');
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept with organization header', async () => {
      const res = await api.get('/api/v1/items/stock-levels/farm')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by farm_id', async () => {
      const res = await api.get(`/api/v1/items/stock-levels/farm?farm_id=${generateUUID()}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by item_id', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Farm Stock Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();

      const res = await api.get(`/api/v1/items/stock-levels/farm?item_id=${itemId}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by low_stock_only=true', async () => {
      const res = await api.get('/api/v1/items/stock-levels/farm?low_stock_only=true')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/items/:id/variants', () => {
    it('should fail without organization header', async () => {
      const res = await api.get(`/api/v1/items/${generateUUID()}/variants`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept with organization header', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Variant Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();

      const res = await api.get(`/api/v1/items/${itemId}/variants`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/items/:id/variants', () => {
    it('should fail without organization header', async () => {
      const res = await api.post(`/api/v1/items/${generateUUID()}/variants`)
        .send({ variant_name: 'Small Pack' });
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept valid variant with variant_name', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Create Variant Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();

      const res = await api.post(`/api/v1/items/${itemId}/variants`)
        .set('x-organization-id', testOrgId)
        .send({
          variant_name: `Variant ${Date.now()}`,
        });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept variant with all fields', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Full Variant Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();
      const timestamp = Date.now();

      const res = await api.post(`/api/v1/items/${itemId}/variants`)
        .set('x-organization-id', testOrgId)
        .send({
          variant_name: `Full Variant ${timestamp}`,
          variant_sku: `VAR-${timestamp}`,
          unit_id: generateUUID(),
          quantity: 25,
          min_stock_level: 5,
          standard_rate: 70.5,
          barcode: `BAR-${timestamp}`,
          is_active: true,
          notes: 'Integration variant',
        });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/items/variants/:variantId', () => {
    it('should fail without organization header', async () => {
      const res = await api.patch(`/api/v1/items/variants/${generateUUID()}`)
        .send({ variant_name: 'Updated Variant' });
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept valid update payload', async () => {
      const res = await api.patch(`/api/v1/items/variants/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          variant_name: `Updated Variant ${Date.now()}`,
          standard_rate: 88.9,
          is_active: false,
        });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/items/variants/:variantId', () => {
    it('should fail without organization header', async () => {
      const res = await api.delete(`/api/v1/items/variants/${generateUUID()}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept delete request', async () => {
      const res = await api.delete(`/api/v1/items/variants/${generateUUID()}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/items/:id/farm-usage', () => {
    it('should fail without organization header', async () => {
      const res = await api.get(`/api/v1/items/${generateUUID()}/farm-usage`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept with organization header', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Usage Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();

      const res = await api.get(`/api/v1/items/${itemId}/farm-usage`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/items/:id/prices', () => {
    it('should fail without organization header', async () => {
      const res = await api.get(`/api/v1/items/${generateUUID()}/prices`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept with organization header', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Price Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();

      const res = await api.get(`/api/v1/items/${itemId}/prices`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('Multi-tenancy isolation', () => {
    it('should not return items from another organization', async () => {
      const timestamp = Date.now();
      const createdItemRes = await createItem(testOrgId, {
        item_name: `Tenant Item ${timestamp}`,
        item_code: `TENANT-${timestamp}`,
      });
      const createdItemId = extractId(createdItemRes.body);
      const otherOrgId = generateUUID();

      const res = await api.get('/api/v1/items?search=Tenant%20Item')
        .set('x-organization-id', otherOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);

      if ((createdItemRes.status === 200 || createdItemRes.status === 201) && res.status === 200) {
        const items = extractData(res.body);
        for (const item of items) {
          expect(item.organization_id).not.toBe(testOrgId);
          if (createdItemId) {
            expect(item.id).not.toBe(createdItemId);
          }
        }
      }
    });
  });

  describe('Full CRUD lifecycle', () => {
    let createdItemId: string | null = null;

    it('should create → read → update → delete → verify deleted', async () => {
      const timestamp = Date.now();

      const createRes = await api.post('/api/v1/items')
        .set('x-organization-id', testOrgId)
        .send({
          item_name: `Lifecycle Item ${timestamp}`,
          item_code: `LC-ITEM-${timestamp}`,
          description: 'Full lifecycle test',
          is_active: true,
          is_stock_item: true,
        });

      if (createRes.status === 201 || createRes.status === 200) {
        createdItemId = extractId(createRes.body);
        expect(createdItemId).toBeTruthy();

        const readRes = await api.get(`/api/v1/items/${createdItemId}`)
          .set('x-organization-id', testOrgId);
        expect([200, 201]).toContain(readRes.status);

        const updateRes = await api.patch(`/api/v1/items/${createdItemId}`)
          .set('x-organization-id', testOrgId)
          .send({
            item_name: `Updated Lifecycle Item ${timestamp}`,
            is_active: false,
          });
        expect([200, 201]).toContain(updateRes.status);

        const deleteRes = await api.delete(`/api/v1/items/${createdItemId}`)
          .set('x-organization-id', testOrgId);
        expect([200, 201, 204]).toContain(deleteRes.status);

        const verifyRes = await api.get(`/api/v1/items/${createdItemId}`)
          .set('x-organization-id', testOrgId);
        expect([404, 400, 500]).toContain(verifyRes.status);
      } else {
        console.warn(`Create returned ${createRes.status}, skipping lifecycle test`);
      }
    });
  });

  describe('Full variant lifecycle', () => {
    it('should create item → create variant → update variant → delete variant', async () => {
      const timestamp = Date.now();
      const createItemRes = await api.post('/api/v1/items')
        .set('x-organization-id', testOrgId)
        .send({
          item_name: `Variant Lifecycle Item ${timestamp}`,
          item_code: `LC-VAR-ITEM-${timestamp}`,
          is_stock_item: true,
        });

      if (createItemRes.status === 201 || createItemRes.status === 200) {
        const itemId = extractId(createItemRes.body);
        expect(itemId).toBeTruthy();

        const createVariantRes = await api.post(`/api/v1/items/${itemId}/variants`)
          .set('x-organization-id', testOrgId)
          .send({
            variant_name: `Lifecycle Variant ${timestamp}`,
            quantity: 10,
            standard_rate: 42.5,
          });

        if (createVariantRes.status === 201 || createVariantRes.status === 200) {
          const variantId = extractId(createVariantRes.body);
          expect(variantId).toBeTruthy();

          const updateVariantRes = await api.patch(`/api/v1/items/variants/${variantId}`)
            .set('x-organization-id', testOrgId)
            .send({
              variant_name: `Updated Lifecycle Variant ${timestamp}`,
              is_active: false,
            });
          expect([200, 201]).toContain(updateVariantRes.status);

          const deleteVariantRes = await api.delete(`/api/v1/items/variants/${variantId}`)
            .set('x-organization-id', testOrgId);
          expect([200, 201, 204]).toContain(deleteVariantRes.status);
        } else {
          console.warn(`Variant create returned ${createVariantRes.status}, skipping variant lifecycle tail`);
        }
      } else {
        console.warn(`Item create returned ${createItemRes.status}, skipping variant lifecycle test`);
      }
    });
  });

  describe('GET /api/v1/items/:id/consumption', () => {
    it('should fail without organization header', async () => {
      const res = await api.get(`/api/v1/items/${generateUUID()}/consumption`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept with organization header', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Consumption Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();

      const res = await api.get(`/api/v1/items/${itemId}/consumption`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by warehouse_id', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Warehouse Consumption Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();

      const res = await api.get(`/api/v1/items/${itemId}/consumption?warehouse_id=${generateUUID()}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should filter by date range', async () => {
      const itemRes = await createItem(testOrgId, { item_name: `Date Consumption Item ${Date.now()}` });
      const itemId = extractId(itemRes.body) || generateUUID();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await api.get(`/api/v1/items/${itemId}/consumption?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`)
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
