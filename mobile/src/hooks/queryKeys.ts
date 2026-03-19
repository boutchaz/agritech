export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
    organizations: () => ['auth', 'organizations'] as const,
    abilities: () => ['auth', 'abilities'] as const,
  },
  dashboard: {
    summary: (orgId: string) => ['dashboard', 'summary', orgId] as const,
  },
  notifications: {
    list: (orgId: string) => ['notifications', orgId] as const,
    unreadCount: (orgId: string) => ['notifications', 'unread', orgId] as const,
  },
  modules: {
    list: (orgId: string) => ['modules', orgId] as const,
  },
  farms: {
    list: (orgId: string) => ['farms', orgId] as const,
    detail: (farmId: string) => ['farms', farmId] as const,
  },
  parcels: {
    list: (farmId?: string) => ['parcels', farmId ?? 'all'] as const,
    detail: (parcelId: string) => ['parcels', parcelId] as const,
    hierarchy: (orgId: string) => ['parcels', 'hierarchy', orgId] as const,
  },
  harvests: {
    list: (filters?: { farmId?: string; dateFrom?: string; dateTo?: string }) =>
      ['harvests', filters ?? {}] as const,
    detail: (harvestId: string) => ['harvests', harvestId] as const,
    statistics: (orgId: string) => ['harvests', 'stats', orgId] as const,
  },
  cropCycles: {
    list: (parcelId?: string) => ['cropCycles', parcelId ?? 'all'] as const,
    detail: (id: string) => ['cropCycles', id] as const,
  },
  crops: {
    list: (orgId: string) => ['crops', orgId] as const,
  },
  trees: {
    list: (parcelId: string) => ['trees', parcelId] as const,
  },
  satellite: {
    indices: (parcelId: string) => ['satellite', 'indices', parcelId] as const,
    timeSeries: (parcelId: string, index: string) =>
      ['satellite', 'timeSeries', parcelId, index] as const,
  },
  weather: {
    forecast: (lat: number, lng: number) => ['weather', 'forecast', lat, lng] as const,
    historical: (parcelId: string) => ['weather', 'historical', parcelId] as const,
  },
  soilAnalyses: {
    list: (parcelId: string) => ['soilAnalyses', parcelId] as const,
  },
  tasks: {
    myTasks: () => ['tasks', 'mine'] as const,
    list: (filters?: { status?: string; farmId?: string }) => ['tasks', 'list', filters ?? {}] as const,
    detail: (taskId: string) => ['tasks', taskId] as const,
    statistics: () => ['tasks', 'statistics'] as const,
    timeLogs: (taskId: string) => ['tasks', taskId, 'timeLogs'] as const,
    comments: (taskId: string) => ['tasks', taskId, 'comments'] as const,
  },
  workers: {
    list: (orgId: string, filters?: { role?: string; farmId?: string }) =>
      ['workers', orgId, filters ?? {}] as const,
    detail: (workerId: string) => ['workers', workerId] as const,
    dayLaborers: (orgId: string) => ['workers', 'dayLaborers', orgId] as const,
  },
  timeLogs: {
    list: (workerId?: string, farmId?: string) =>
      ['timeLogs', workerId ?? 'all', farmId ?? 'all'] as const,
    summary: (workerId: string, period: string) =>
      ['timeLogs', 'summary', workerId, period] as const,
  },
  items: {
    list: (orgId: string, filters?: { groupId?: string; search?: string }) =>
      ['items', orgId, filters ?? {}] as const,
    detail: (itemId: string) => ['items', itemId] as const,
    variants: (itemId: string) => ['items', itemId, 'variants'] as const,
    groups: (orgId: string) => ['items', 'groups', orgId] as const,
  },
  warehouses: {
    list: (orgId: string) => ['warehouses', orgId] as const,
    detail: (warehouseId: string) => ['warehouses', warehouseId] as const,
  },
  stockEntries: {
    list: (orgId: string, filters?: { warehouseId?: string; type?: string }) =>
      ['stockEntries', orgId, filters ?? {}] as const,
  },
  suppliers: {
    list: (orgId: string) => ['suppliers', orgId] as const,
    detail: (supplierId: string) => ['suppliers', supplierId] as const,
  },
  receptionBatches: {
    list: (orgId: string) => ['receptionBatches', orgId] as const,
  },
  accounts: {
    list: (orgId: string) => ['accounts', orgId] as const,
    detail: (accountId: string) => ['accounts', accountId] as const,
  },
  journalEntries: {
    list: (orgId: string, filters?: { dateFrom?: string; dateTo?: string }) =>
      ['journalEntries', orgId, filters ?? {}] as const,
  },
  invoices: {
    list: (orgId: string, filters?: { status?: string; customerId?: string }) =>
      ['invoices', orgId, filters ?? {}] as const,
    detail: (invoiceId: string) => ['invoices', invoiceId] as const,
  },
  payments: {
    list: (orgId: string, filters?: { type?: string; dateFrom?: string }) =>
      ['payments', orgId, filters ?? {}] as const,
  },
  customers: {
    list: (orgId: string) => ['customers', orgId] as const,
    detail: (customerId: string) => ['customers', customerId] as const,
  },
  quotes: {
    list: (orgId: string) => ['quotes', orgId] as const,
    detail: (quoteId: string) => ['quotes', quoteId] as const,
  },
  salesOrders: {
    list: (orgId: string) => ['salesOrders', orgId] as const,
  },
  purchaseOrders: {
    list: (orgId: string) => ['purchaseOrders', orgId] as const,
  },
  profile: {
    me: () => ['profile', 'me'] as const,
  },
  users: {
    list: (orgId: string) => ['users', orgId] as const,
  },
} as const;
