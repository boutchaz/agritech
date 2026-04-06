const ts = () => Date.now();

export const testData = {
  farm: (overrides = {}) => ({
    name: `Test Farm ${ts()}`,
    location: 'Integration Test Location',
    size: 50,
    size_unit: 'hectares',
    farm_type: 'main',
    ...overrides,
  }),

  parcel: (farmId: string, overrides = {}) => ({
    name: `Test Parcel ${ts()}`,
    farm_id: farmId,
    area: 10,
    area_unit: 'hectares',
    crop_type: 'vegetables',
    ...overrides,
  }),

  customer: (overrides = {}) => ({
    name: `Test Customer ${ts()}`,
    email: `customer-${ts()}@test.agritech.com`,
    phone: '+212600000001',
    type: 'individual',
    status: 'active',
    ...overrides,
  }),

  supplier: (overrides = {}) => ({
    name: `Test Supplier ${ts()}`,
    email: `supplier-${ts()}@test.agritech.com`,
    phone: '+212600000002',
    type: 'company',
    status: 'active',
    ...overrides,
  }),

  item: (overrides = {}) => ({
    item_name: `Test Item ${ts()}`,
    item_code: `ITEM-${ts()}`,
    default_unit: 'kg',
    is_inventory_item: true,
    is_sales_item: true,
    is_purchase_item: true,
    ...overrides,
  }),

  warehouse: (overrides = {}) => ({
    name: `Test Warehouse ${ts()}`,
    type: 'warehouse',
    is_default: false,
    ...overrides,
  }),

  worker: (overrides = {}) => ({
    first_name: 'Test',
    last_name: `Worker ${ts()}`,
    phone: `+2126${String(ts()).slice(-8)}`,
    role: 'farm_worker',
    status: 'active',
    ...overrides,
  }),

  task: (overrides = {}) => ({
    title: `Test Task ${ts()}`,
    description: 'Integration test task',
    priority: 'medium',
    status: 'pending',
    ...overrides,
  }),

  harvest: (parcelId: string, overrides = {}) => ({
    parcel_id: parcelId,
    crop_type: 'tomatoes',
    quantity: 100,
    unit: 'kg',
    harvest_date: new Date().toISOString().split('T')[0],
    quality_grade: 'A',
    ...overrides,
  }),

  account: (overrides = {}) => ({
    account_number: `${ts()}`,
    name: `Test Account ${ts()}`,
    type: 'asset',
    ...overrides,
  }),

  fiscalYear: (overrides = {}) => {
    const year = new Date().getFullYear();
    return {
      name: `FY ${year}-${ts()}`,
      start_date: `${year}-01-01`,
      end_date: `${year}-12-31`,
      ...overrides,
    };
  },

  invoice: (customerId: string, overrides = {}) => ({
    customer_id: customerId,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    items: [
      {
        description: 'Test item',
        quantity: 1,
        unit_price: 100,
      },
    ],
    ...overrides,
  }),

  quote: (customerId: string, overrides = {}) => ({
    customer_id: customerId,
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    items: [
      {
        description: 'Test quote item',
        quantity: 2,
        unit_price: 50,
      },
    ],
    ...overrides,
  }),

  salesOrder: (customerId: string, overrides = {}) => ({
    customer_id: customerId,
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    items: [
      {
        description: 'Test order item',
        quantity: 5,
        unit_price: 25,
      },
    ],
    ...overrides,
  }),

  campaign: (overrides = {}) => ({
    name: `Test Campaign ${ts()}`,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    status: 'planned',
    ...overrides,
  }),

  biologicalAsset: (overrides = {}) => ({
    name: `Test Biological Asset ${ts()}`,
    asset_type: 'livestock',
    quantity: 10,
    unit_cost: 500,
    ...overrides,
  }),

  soilAnalysis: (overrides = {}) => ({
    sample_date: new Date().toISOString().split('T')[0],
    ph: 7.2,
    organic_matter: 2.5,
    nitrogen: 30,
    phosphorus: 20,
    potassium: 40,
    ...overrides,
  }),

  analysis: (overrides = {}) => ({
    analysis_date: new Date().toISOString().split('T')[0],
    type: 'soil',
    status: 'pending',
    ...overrides,
  }),

  pestReport: (overrides = {}) => ({
    pest_type: 'aphids',
    severity: 'low',
    affected_area_percent: 10,
    observation_date: new Date().toISOString().split('T')[0],
    ...overrides,
  }),

  certification: (overrides = {}) => ({
    name: `Test Certification ${ts()}`,
    certifying_body: 'Test Body',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    status: 'active',
    ...overrides,
  }),

  complianceCheck: (overrides = {}) => ({
    title: `Test Compliance Check ${ts()}`,
    status: 'pending',
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    ...overrides,
  }),

  marketplaceListing: (overrides = {}) => ({
    title: `Test Listing ${ts()}`,
    description: 'Integration test listing',
    price: 100,
    unit: 'kg',
    category: 'vegetables',
    ...overrides,
  }),
};
