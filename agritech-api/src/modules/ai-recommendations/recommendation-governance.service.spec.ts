import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationGovernanceService } from './recommendation-governance.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  setupThenableMock,
} from '../../../test/helpers/mock-database.helper';

describe('RecommendationGovernanceService', () => {
  let service: RecommendationGovernanceService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    const mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationGovernanceService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get(RecommendationGovernanceService);
  });

  describe('VALID_TRANSITIONS', () => {
    it('allows proposed → validated', () => {
      expect(service.isValidTransition('proposed', 'validated')).toBe(true);
    });

    it('allows proposed → rejected', () => {
      expect(service.isValidTransition('proposed', 'rejected')).toBe(true);
    });

    it('allows validated → executed', () => {
      expect(service.isValidTransition('validated', 'executed')).toBe(true);
    });

    it('allows executed → evaluated', () => {
      expect(service.isValidTransition('executed', 'evaluated')).toBe(true);
    });

    it('rejects proposed → executed (must validate first)', () => {
      expect(service.isValidTransition('proposed', 'executed')).toBe(false);
    });

    it('rejects closed → proposed (terminal state)', () => {
      expect(service.isValidTransition('closed', 'proposed')).toBe(false);
    });
  });

  describe('requiresMotif', () => {
    it('requires motif for urgent rejection', () => {
      expect(service.requiresMotifForRejection('urgent')).toBe(true);
    });

    it('requires motif for priority rejection', () => {
      expect(service.requiresMotifForRejection('priority')).toBe(true);
    });

    it('does not require motif for vigilance rejection', () => {
      expect(service.requiresMotifForRejection('vigilance')).toBe(false);
    });

    it('does not require motif for info rejection', () => {
      expect(service.requiresMotifForRejection('info')).toBe(false);
    });
  });
});
