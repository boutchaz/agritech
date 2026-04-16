import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CorrectiveActionsService } from './corrective-actions.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockSupabaseClient,
  createMockQueryBuilder,
  createThenableQueryBuilder,
  MockDatabaseService,
  MockSupabaseClient,
  setupTableMock,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';
import {
  CorrectiveActionStatus,
  CorrectiveActionPriority,
} from './dto/corrective-action.dto';

jest.mock('../../common/dto/paginated-query.dto', () => {
  const original = jest.requireActual('../../common/dto/paginated-query.dto');
  return {
    ...original,
    paginate: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 0,
    }),
  };
});

import { paginate } from '../../common/dto/paginated-query.dto';

function makeEqThenable(builder: any, data: any, error: any = null) {
  const result = { data, error };
  builder.eq.mockImplementation(() => {
    const promise = Promise.resolve(result);
    const proxy = new Proxy(promise, {
      get(target, prop) {
        if (prop === 'then') return target.then.bind(target);
        return (builder as any)[prop];
      },
    });
    return proxy;
  });
}

describe('CorrectiveActionsService', () => {
  let service: CorrectiveActionsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = TEST_IDS.organization;
  const userId = TEST_IDS.user;
  const actionId = 'ca-111111111111';
  const certificationId = 'cert-222222222222';

  const mockAction = {
    id: actionId,
    organization_id: organizationId,
    compliance_check_id: 'check-333',
    certification_id: certificationId,
    finding_description: 'Non-compliant irrigation records',
    requirement_code: 'AF-3.1',
    priority: CorrectiveActionPriority.HIGH,
    action_description: 'Update irrigation log records',
    responsible_person: 'Ahmed',
    due_date: '2026-06-30',
    notes: 'Urgent',
    status: CorrectiveActionStatus.OPEN,
    created_by: userId,
    resolved_at: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: null,
    certification: { id: certificationId, certification_type: 'GlobalGAP', certification_number: 'GGN-001' },
    compliance_check: { id: 'check-333', check_type: 'traceability', check_date: '2026-03-15', status: 'non_compliant' },
  };

  function makeThenable(data: any, error: any = null) {
    return createThenableQueryBuilder(data, error);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorrectiveActionsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CorrectiveActionsService>(CorrectiveActionsService);
  });

  describe('findAll', () => {
    it('should return paginated corrective actions', async () => {
      const mockPaginatedResult = {
        data: [mockAction],
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      };
      (paginate as jest.Mock).mockResolvedValueOnce(mockPaginatedResult);

      const result = await service.findAll(organizationId);

      expect(paginate).toHaveBeenCalledWith(
        mockClient,
        'corrective_actions',
        expect.objectContaining({
          select: expect.any(String),
          page: 1,
          pageSize: 50,
          orderBy: 'created_at',
          ascending: false,
        }),
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass status, priority, certification_id and overdue filters', async () => {
      (paginate as jest.Mock).mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        pageSize: 50,
        totalPages: 0,
      });

      await service.findAll(organizationId, {
        status: CorrectiveActionStatus.OPEN,
        priority: CorrectiveActionPriority.HIGH,
        certification_id: certificationId,
        overdue: true,
      });

      const callArgs = (paginate as jest.Mock).mock.calls[0];
      const options = callArgs[2];
      const filterBuilder = createMockQueryBuilder();
      const filtersFn = options.filters;
      filtersFn(filterBuilder);

      expect(filterBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(filterBuilder.eq).toHaveBeenCalledWith('status', CorrectiveActionStatus.OPEN);
      expect(filterBuilder.eq).toHaveBeenCalledWith('priority', CorrectiveActionPriority.HIGH);
      expect(filterBuilder.eq).toHaveBeenCalledWith('certification_id', certificationId);
      expect(filterBuilder.lt).toHaveBeenCalledWith('due_date', expect.any(String));
    });
  });

  describe('findOne', () => {
    it('should return a corrective action by ID', async () => {
      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({ data: mockAction, error: null });

      const result = await service.findOne(organizationId, actionId);

      expect(result).toEqual(mockAction);
    });

    it('should throw NotFoundException if action not found', async () => {
      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(service.findOne(organizationId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a corrective action with OPEN status', async () => {
      const dto = {
        compliance_check_id: 'check-333',
        certification_id: certificationId,
        finding_description: 'Non-compliant irrigation records',
        requirement_code: 'AF-3.1',
        priority: CorrectiveActionPriority.HIGH,
        action_description: 'Update irrigation log records',
        responsible_person: 'Ahmed',
        due_date: '2026-06-30',
        notes: 'Urgent',
      };

      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({ data: mockAction, error: null });

      await service.create(organizationId, userId, dto);

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: organizationId,
          compliance_check_id: dto.compliance_check_id,
          certification_id: dto.certification_id,
          status: CorrectiveActionStatus.OPEN,
          created_by: userId,
        }),
      );
    });

    it('should throw if database insert fails', async () => {
      const dto = {
        certification_id: certificationId,
        finding_description: 'Test',
        priority: CorrectiveActionPriority.LOW,
        action_description: 'Fix it',
        responsible_person: 'Hassan',
        due_date: '2026-07-01',
      };

      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(service.create(organizationId, userId, dto)).rejects.toEqual(
        expect.objectContaining({ message: 'Insert failed' }),
      );
    });
  });

  describe('update', () => {
    it('should update a corrective action after verifying existence', async () => {
      const dto = {
        status: CorrectiveActionStatus.IN_PROGRESS,
        action_description: 'Updated action plan',
      };

      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single
        .mockResolvedValueOnce({ data: mockAction, error: null })
        .mockResolvedValueOnce({
          data: { ...mockAction, ...dto, updated_by: userId },
          error: null,
        });

      await service.update(organizationId, actionId, userId, dto);

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          updated_by: userId,
        }),
      );
    });

    it('should auto-set resolved_at when status becomes RESOLVED without explicit date', async () => {
      const dto = {
        status: CorrectiveActionStatus.RESOLVED,
      };

      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single
        .mockResolvedValueOnce({ data: mockAction, error: null })
        .mockResolvedValueOnce({
          data: { ...mockAction, status: CorrectiveActionStatus.RESOLVED },
          error: null,
        });

      await service.update(organizationId, actionId, userId, dto);

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          resolved_at: expect.any(String),
        }),
      );
    });

    it('should use explicit resolved_at when provided', async () => {
      const explicitDate = '2026-05-01T00:00:00Z';
      const dto = {
        status: CorrectiveActionStatus.RESOLVED,
        resolved_at: explicitDate,
      };

      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single
        .mockResolvedValueOnce({ data: mockAction, error: null })
        .mockResolvedValueOnce({
          data: { ...mockAction, status: CorrectiveActionStatus.RESOLVED },
          error: null,
        });

      await service.update(organizationId, actionId, userId, dto);

      const updateCall = builder.update.mock.calls[0][0];
      expect(updateCall.resolved_at).toBe(explicitDate);
    });

    it('should throw NotFoundException if action does not exist', async () => {
      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(
        service.update(organizationId, 'nonexistent', userId, { status: CorrectiveActionStatus.IN_PROGRESS }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a corrective action after verifying existence', async () => {
      const findOneBuilder = setupTableMock(mockClient, 'corrective_actions');
      findOneBuilder.select.mockReturnValue(findOneBuilder);
      findOneBuilder.eq.mockReturnValue(findOneBuilder);
      findOneBuilder.single.mockResolvedValueOnce({ data: mockAction, error: null });

      const deleteBuilder = createThenableQueryBuilder(null, null);
      deleteBuilder.delete.mockReturnValue(deleteBuilder);
      deleteBuilder.eq.mockReturnValue(deleteBuilder);

      let findOneDone = false;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'corrective_actions') {
          if (!findOneDone) {
            findOneDone = true;
            return findOneBuilder;
          }
          return deleteBuilder;
        }
        return createMockQueryBuilder();
      });

      await service.remove(organizationId, actionId);

      expect(deleteBuilder.delete).toHaveBeenCalled();
      expect(deleteBuilder.eq).toHaveBeenCalledWith('id', actionId);
      expect(deleteBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
    });

    it('should throw NotFoundException if action does not exist', async () => {
      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await expect(service.remove(organizationId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should calculate stats correctly for mixed actions', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);

      const actions = [
        {
          status: CorrectiveActionStatus.OPEN,
          due_date: yesterday.toISOString().split('T')[0],
          resolved_at: null,
          created_at: '2026-03-01T10:00:00Z',
        },
        {
          status: CorrectiveActionStatus.IN_PROGRESS,
          due_date: '2030-01-01',
          resolved_at: null,
          created_at: '2026-03-01T10:00:00Z',
        },
        {
          status: CorrectiveActionStatus.RESOLVED,
          due_date: '2026-04-15',
          resolved_at: '2026-04-05T10:00:00Z',
          created_at: '2026-04-01T10:00:00Z',
        },
        {
          status: CorrectiveActionStatus.VERIFIED,
          due_date: '2026-04-20',
          resolved_at: '2026-04-10T10:00:00Z',
          created_at: '2026-04-01T10:00:00Z',
        },
      ];

      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      makeEqThenable(builder, actions);

      const stats = await service.getStats(organizationId);

      expect(stats.total).toBe(4);
      expect(stats.open).toBe(1);
      expect(stats.in_progress).toBe(1);
      expect(stats.resolved).toBe(1);
      expect(stats.verified).toBe(1);
      expect(stats.overdue).toBe(1);
      expect(stats.resolution_rate).toBe(0.5);
      expect(stats.average_resolution_days).toBe(6.5);
    });

    it('should return zero stats when no actions exist', async () => {
      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      makeEqThenable(builder, []);

      const stats = await service.getStats(organizationId);

      expect(stats.total).toBe(0);
      expect(stats.open).toBe(0);
      expect(stats.resolution_rate).toBe(0);
      expect(stats.average_resolution_days).toBe(0);
    });

    it('should throw when database returns error', async () => {
      const builder = setupTableMock(mockClient, 'corrective_actions');
      builder.select.mockReturnValue(builder);
      makeEqThenable(builder, null, { message: 'DB error' });

      await expect(service.getStats(organizationId)).rejects.toEqual(
        expect.objectContaining({ message: 'DB error' }),
      );
    });
  });
});
