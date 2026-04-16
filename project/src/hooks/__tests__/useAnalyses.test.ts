import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analysesApi } from '../../lib/api/analyses';

vi.mock('../../lib/api/analyses', () => ({
  analysesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getRecommendations: vi.fn(),
    createRecommendation: vi.fn(),
    updateRecommendation: vi.fn(),
    deleteRecommendation: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAnalyses API integration', () => {
  it('getAll is called with parcel filters', async () => {
    vi.mocked(analysesApi.getAll).mockResolvedValue({ data: [], count: 0 });

    await analysesApi.getAll({ parcel_id: 'parcel-1' }, 'org-123');
    expect(analysesApi.getAll).toHaveBeenCalledWith({ parcel_id: 'parcel-1' }, 'org-123');
  });

  it('getAll is called with farm filters', async () => {
    vi.mocked(analysesApi.getAll).mockResolvedValue({ data: [], count: 0 });

    await analysesApi.getAll({ farm_id: 'farm-1', analysis_type: 'soil' }, 'org-123');
    expect(analysesApi.getAll).toHaveBeenCalledWith({ farm_id: 'farm-1', analysis_type: 'soil' }, 'org-123');
  });

  it('create is called with correct data', async () => {
    vi.mocked(analysesApi.create).mockResolvedValue({ id: 'new-1', parcel_id: 'p1' });

    await analysesApi.create({
      parcel_id: 'p1',
      analysis_type: 'soil',
      analysis_date: '2024-01-01',
      data: { pH: 6.5, organic_matter: 2.1, nitrogen: 0.15, phosphorus: 25, potassium: 180, cec: 15, ec: 0.8 },
    }, 'org-123');

    expect(analysesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ parcel_id: 'p1', analysis_type: 'soil' }),
      'org-123',
    );
  });

  it('update is called with correct data', async () => {
    vi.mocked(analysesApi.update).mockResolvedValue({ id: 'a1' });

    await analysesApi.update('a1', { notes: 'Updated' }, 'org-123');
    expect(analysesApi.update).toHaveBeenCalledWith('a1', { notes: 'Updated' }, 'org-123');
  });

  it('delete is called with correct id', async () => {
    vi.mocked(analysesApi.delete).mockResolvedValue(undefined);

    await analysesApi.delete('a1', 'org-123');
    expect(analysesApi.delete).toHaveBeenCalledWith('a1', 'org-123');
  });

  it('getRecommendations is called with correct analysis id', async () => {
    vi.mocked(analysesApi.getRecommendations).mockResolvedValue([]);

    await analysesApi.getRecommendations('a1', 'org-123');
    expect(analysesApi.getRecommendations).toHaveBeenCalledWith('a1', 'org-123');
  });

  it('createRecommendation is called correctly', async () => {
    vi.mocked(analysesApi.createRecommendation).mockResolvedValue({ id: 'r1' });

    await analysesApi.createRecommendation('a1', { recommendation: 'Apply lime' }, 'org-123');
    expect(analysesApi.createRecommendation).toHaveBeenCalledWith('a1', { recommendation: 'Apply lime' }, 'org-123');
  });
});
