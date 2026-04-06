import { getChatToolsServiceMockProviders } from './test-helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatToolsService } from '../chat-tools.service';
import { PendingActionService } from '../pending-action.service';
import { TasksService } from '../../../tasks/tasks.service';
import { AnnualPlanService } from '../../../annual-plan/annual-plan.service';
import { CaslAbilityFactory } from '../../../casl/casl-ability.factory';
import { DatabaseService } from '../../../database/database.service';

describe('mark_intervention_done tool with mode=preview', () => {
  let service: ChatToolsService;
  let mockPendingActionService: jest.Mocked<PendingActionService>;
  let mockAnnualPlanService: any;

  const userId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const orgId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
  const interventionId = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';

  beforeEach(async () => {
    mockPendingActionService = {
      upsert: jest.fn().mockResolvedValue({
        id: 'pending-id',
        user_id: userId,
        organization_id: orgId,
        tool_name: 'mark_intervention_done',
        parameters: {},
        preview_data: {},
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
      load: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockAnnualPlanService = {
      executeIntervention: jest.fn().mockResolvedValue(undefined),
    };

    const mockCaslAbilityFactory = {
      hasPermission: jest.fn().mockResolvedValue(true),
    };

    // Mock DB lookup for intervention details
    const buildLookupChain = (data: any) => {
      const singleMock = jest.fn().mockResolvedValue({ data, error: null });
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: singleMock,
              maybeSingle: singleMock,
            }),
            single: singleMock,
            maybeSingle: singleMock,
          }),
        }),
      };
    };

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'plan_interventions') {
          return buildLookupChain({
            id: interventionId,
            titre: 'Traitement phytosanitaire',
            annual_plan: { titre: 'Plan 2026 - Oliviers' },
          });
        }
        return buildLookupChain(null);
      }),
    };

    const mockDatabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockSupabase),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatToolsService,
        { provide: PendingActionService, useValue: mockPendingActionService },
        { provide: TasksService, useValue: { create: jest.fn() } },
        { provide: AnnualPlanService, useValue: mockAnnualPlanService },
        { provide: CaslAbilityFactory, useValue: mockCaslAbilityFactory },
        { provide: DatabaseService, useValue: mockDatabaseService },
        ...getChatToolsServiceMockProviders(),
      ],
    }).compile();

    service = module.get<ChatToolsService>(ChatToolsService);
  });

  it('should return preview_data and store pending action, NOT execute', async () => {
    const result = await service.executeTool(
      'mark_intervention_done',
      { mode: 'preview', intervention_id: interventionId },
      userId,
      orgId,
    );

    expect(result.success).toBe(true);
    expect(result.preview_data).toBeDefined();
    expect(result.preview_data.action_type).toBe('mark_intervention_done');
    expect(result.preview_data.intervention_id).toBe(interventionId);

    expect(mockPendingActionService.upsert).toHaveBeenCalledWith(
      userId,
      orgId,
      'mark_intervention_done',
      expect.objectContaining({ intervention_id: interventionId }),
      expect.objectContaining({ action_type: 'mark_intervention_done' }),
    );

    // Should NOT have called executeIntervention
    expect(mockAnnualPlanService.executeIntervention).not.toHaveBeenCalled();
  });

  it('should include mode param in tool definition', () => {
    const defs = service.getToolDefinitions();
    const tool = defs.find((d) => d.function.name === 'mark_intervention_done');
    expect(tool).toBeDefined();
    expect(tool!.function.parameters.properties.mode).toBeDefined();
  });
});
