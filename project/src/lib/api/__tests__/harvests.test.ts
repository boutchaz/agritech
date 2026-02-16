import { describe, it, expect, vi, beforeEach } from 'vitest';
import { harvestsApi } from '../harvests';
import type { PaginatedResponse } from '../types';
import type {
  HarvestSummary,
  HarvestRecord,
  CreateHarvestRequest,
} from '../../../types/harvests';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  ApiClient: vi.fn(),
}));

const ORG_ID = 'org-123';
const HARVEST_ID = 'harvest-456';

const mockHarvestSummary: HarvestSummary = {
  id: HARVEST_ID,
  organization_id: ORG_ID,
  farm_id: 'farm-1',
  parcel_id: 'parcel-1',
  harvest_date: '2025-06-15',
  quantity: 500,
  unit: 'kg',
  quality_grade: 'A',
  status: 'stored',
  workers: [],
  created_at: '2025-06-15T10:00:00Z',
  updated_at: '2025-06-15T10:00:00Z',
  worker_count: 3,
  delivery_count: 1,
  quantity_delivered: 200,
};

const mockHarvestRecord: HarvestRecord = {
  id: HARVEST_ID,
  organization_id: ORG_ID,
  farm_id: 'farm-1',
  parcel_id: 'parcel-1',
  harvest_date: '2025-06-15',
  quantity: 500,
  unit: 'kg',
  quality_grade: 'A',
  status: 'stored',
  workers: [{ worker_id: 'w1', hours_worked: 8 }],
  created_at: '2025-06-15T10:00:00Z',
  updated_at: '2025-06-15T10:00:00Z',
};

describe('harvestsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('fetches all harvests with correct org-scoped URL', async () => {
      mockGet.mockResolvedValue({ data: [mockHarvestSummary] });

      const result = await harvestsApi.getAll(undefined, ORG_ID);

      expect(mockGet).toHaveBeenCalledWith(
        `/api/v1/organizations/${ORG_ID}/harvests`
      );
      expect(result).toEqual([mockHarvestSummary]);
    });

    it('appends filter query params to URL', async () => {
      mockGet.mockResolvedValue({ data: [mockHarvestSummary] });

      await harvestsApi.getAll(
        { status: 'stored', parcel_id: 'parcel-1' },
        ORG_ID
      );

      const calledUrl = mockGet.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`/api/v1/organizations/${ORG_ID}/harvests?`);
      expect(calledUrl).toContain('status=stored');
      expect(calledUrl).toContain('parcel_id=parcel-1');
    });

    it('returns empty array when response data is undefined', async () => {
      mockGet.mockResolvedValue({});

      const result = await harvestsApi.getAll(undefined, ORG_ID);

      expect(result).toEqual([]);
    });

    it('throws when organizationId is missing', async () => {
      await expect(harvestsApi.getAll(undefined, undefined)).rejects.toThrow(
        'organizationId is required in harvestsApi.getAll'
      );
    });
  });

  describe('getPaginated', () => {
    const paginatedResponse: PaginatedResponse<HarvestSummary> = {
      data: [mockHarvestSummary],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };

    it('builds paginated URL with all query params', async () => {
      mockGet.mockResolvedValue(paginatedResponse);

      await harvestsApi.getPaginated(ORG_ID, {
        page: 2,
        pageSize: 10,
        sortBy: 'harvest_date',
        sortDir: 'desc',
        search: 'tomato',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
        parcel_id: 'parcel-1',
        crop_id: 'crop-1',
        status: 'stored',
        quality_grade: 'A',
      });

      const calledUrl = mockGet.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=2');
      expect(calledUrl).toContain('pageSize=10');
      expect(calledUrl).toContain('sortBy=harvest_date');
      expect(calledUrl).toContain('sortDir=desc');
      expect(calledUrl).toContain('search=tomato');
      expect(calledUrl).toContain('dateFrom=2025-01-01');
      expect(calledUrl).toContain('dateTo=2025-12-31');
      expect(calledUrl).toContain('parcel_id=parcel-1');
      expect(calledUrl).toContain('crop_id=crop-1');
      expect(calledUrl).toContain('status=stored');
      expect(calledUrl).toContain('quality_grade=A');
    });

    it('omits empty query params', async () => {
      mockGet.mockResolvedValue(paginatedResponse);

      await harvestsApi.getPaginated(ORG_ID, { page: 1 });

      const calledUrl = mockGet.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).not.toContain('pageSize');
      expect(calledUrl).not.toContain('sortBy');
    });

    it('returns full paginated response', async () => {
      mockGet.mockResolvedValue(paginatedResponse);

      const result = await harvestsApi.getPaginated(ORG_ID, { page: 1 });

      expect(result).toEqual(paginatedResponse);
    });

    it('builds URL with no query string when query is empty', async () => {
      mockGet.mockResolvedValue(paginatedResponse);

      await harvestsApi.getPaginated(ORG_ID, {});

      const calledUrl = mockGet.mock.calls[0][0] as string;
      expect(calledUrl).toBe(`/api/v1/organizations/${ORG_ID}/harvests`);
    });
  });

  describe('getOne', () => {
    it('fetches single harvest with correct URL', async () => {
      mockGet.mockResolvedValue(mockHarvestRecord);

      const result = await harvestsApi.getOne(HARVEST_ID, ORG_ID);

      expect(mockGet).toHaveBeenCalledWith(
        `/api/v1/organizations/${ORG_ID}/harvests/${HARVEST_ID}`
      );
      expect(result).toEqual(mockHarvestRecord);
    });

    it('throws when organizationId is missing', async () => {
      await expect(
        harvestsApi.getOne(HARVEST_ID, undefined)
      ).rejects.toThrow('organizationId is required in harvestsApi.getOne');
    });
  });

  describe('getById', () => {
    it('delegates to getOne with swapped argument order', async () => {
      mockGet.mockResolvedValue(mockHarvestRecord);

      const result = await harvestsApi.getById(ORG_ID, HARVEST_ID);

      expect(mockGet).toHaveBeenCalledWith(
        `/api/v1/organizations/${ORG_ID}/harvests/${HARVEST_ID}`
      );
      expect(result).toEqual(mockHarvestRecord);
    });
  });

  describe('create', () => {
    const createData: CreateHarvestRequest = {
      farm_id: 'farm-1',
      parcel_id: 'parcel-1',
      harvest_date: '2025-06-15',
      quantity: 500,
      unit: 'kg',
      quality_grade: 'A',
      workers: [{ worker_id: 'w1', hours_worked: 8 }],
    };

    it('posts harvest data to correct URL', async () => {
      mockPost.mockResolvedValue(mockHarvestRecord);

      const result = await harvestsApi.create(createData, ORG_ID);

      expect(mockPost).toHaveBeenCalledWith(
        `/api/v1/organizations/${ORG_ID}/harvests`,
        createData
      );
      expect(result).toEqual(mockHarvestRecord);
    });

    it('throws when organizationId is missing', async () => {
      await expect(
        harvestsApi.create(createData, undefined)
      ).rejects.toThrow('organizationId is required in harvestsApi.create');
    });
  });

  describe('update', () => {
    const updateData: Partial<HarvestRecord> = {
      quantity: 600,
      quality_grade: 'B',
    };

    it('patches harvest with correct URL and data', async () => {
      mockPatch.mockResolvedValue({ ...mockHarvestRecord, ...updateData });

      const result = await harvestsApi.update(HARVEST_ID, updateData, ORG_ID);

      expect(mockPatch).toHaveBeenCalledWith(
        `/api/v1/organizations/${ORG_ID}/harvests/${HARVEST_ID}`,
        updateData
      );
      expect(result.quantity).toBe(600);
    });

    it('throws when organizationId is missing', async () => {
      await expect(
        harvestsApi.update(HARVEST_ID, updateData, undefined)
      ).rejects.toThrow('organizationId is required in harvestsApi.update');
    });
  });

  describe('delete', () => {
    it('sends delete to correct URL', async () => {
      mockDelete.mockResolvedValue(undefined);

      await harvestsApi.delete(HARVEST_ID, ORG_ID);

      expect(mockDelete).toHaveBeenCalledWith(
        `/api/v1/organizations/${ORG_ID}/harvests/${HARVEST_ID}`
      );
    });

    it('throws when organizationId is missing', async () => {
      await expect(
        harvestsApi.delete(HARVEST_ID, undefined)
      ).rejects.toThrow('organizationId is required in harvestsApi.delete');
    });
  });
});
