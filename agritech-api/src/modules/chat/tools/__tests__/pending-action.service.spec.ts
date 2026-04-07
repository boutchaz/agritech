import { Test, TestingModule } from '@nestjs/testing';
import { PendingActionService, PendingAction } from '../pending-action.service';
import { DatabaseService } from '../../../database/database.service';

describe('PendingActionService', () => {
  let service: PendingActionService;
  let mockSupabase: any;

  const userId = '11111111-1111-1111-1111-111111111111';
  const orgId = '22222222-2222-2222-2222-222222222222';
  const toolName = 'record_harvest';
  const parameters = { parcel_id: 'abc', quantity: 3, unit: 'tons' };
  const previewData = { parcel_name: 'B3', quantity: 3, unit: 'tons' };

  beforeEach(async () => {
    // Build a chainable mock for Supabase query builder
    mockSupabase = {
      from: jest.fn(),
    };

    const mockDatabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockSupabase),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PendingActionService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<PendingActionService>(PendingActionService);
  });

  describe('upsert', () => {
    it('should store a pending action via upsert', async () => {
      const mockRow = {
        id: 'action-id',
        user_id: userId,
        organization_id: orgId,
        tool_name: toolName,
        parameters,
        preview_data: previewData,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      const selectMock = jest.fn().mockResolvedValue({ data: mockRow, error: null });
      const upsertMock = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: selectMock }) });
      mockSupabase.from.mockReturnValue({ upsert: upsertMock });

      const result = await service.upsert(userId, orgId, toolName, parameters, previewData);

      expect(mockSupabase.from).toHaveBeenCalledWith('chat_pending_actions');
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          organization_id: orgId,
          tool_name: toolName,
          parameters,
          preview_data: previewData,
        }),
        expect.objectContaining({ onConflict: 'user_id,organization_id' }),
      );
      expect(result).toEqual(mockRow);
    });
  });

  describe('load', () => {
    it('should return the pending action if not expired', async () => {
      const mockRow = {
        id: 'action-id',
        user_id: userId,
        organization_id: orgId,
        tool_name: toolName,
        parameters,
        preview_data: previewData,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      const maybeSingleMock = jest.fn().mockResolvedValue({ data: mockRow, error: null });
      const gtMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqOrgMock = jest.fn().mockReturnValue({ gt: gtMock });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqOrgMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqUserMock });
      mockSupabase.from.mockReturnValue({ select: selectMock });

      const result = await service.load(userId, orgId);

      expect(result).toEqual(mockRow);
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqUserMock).toHaveBeenCalledWith('user_id', userId);
      expect(eqOrgMock).toHaveBeenCalledWith('organization_id', orgId);
    });

    it('should return null when no pending action exists', async () => {
      const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
      const gtMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqOrgMock = jest.fn().mockReturnValue({ gt: gtMock });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqOrgMock });
      const selectMock = jest.fn().mockReturnValue({ eq: eqUserMock });
      mockSupabase.from.mockReturnValue({ select: selectMock });

      const result = await service.load(userId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete the pending action for user+org', async () => {
      const eqOrgMock = jest.fn().mockResolvedValue({ error: null });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqOrgMock });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqUserMock });
      mockSupabase.from.mockReturnValue({ delete: deleteMock });

      await service.delete(userId, orgId);

      expect(mockSupabase.from).toHaveBeenCalledWith('chat_pending_actions');
      expect(deleteMock).toHaveBeenCalled();
      expect(eqUserMock).toHaveBeenCalledWith('user_id', userId);
      expect(eqOrgMock).toHaveBeenCalledWith('organization_id', orgId);
    });
  });
});
