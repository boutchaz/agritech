import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockSupabaseClient,
  setupTableMock,
  setupThenableMock,
  MockDatabaseService,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('AuditService', () => {
  let service: AuditService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = TEST_IDS.organization;
  const userId = TEST_IDS.user;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logChange', () => {
    it('creates an audit row with organization_id and redacted sensitive fields', async () => {
      const builder = setupTableMock(mockClient, 'audit_logs');
      setupThenableMock(builder, null);

      await service.logChange({
        tableName: 'certifications',
        recordId: 'cert-001',
        action: 'UPDATE',
        oldData: {
          status: 'draft',
          password: 'secret-value',
        },
        newData: {
          status: 'active',
          api_key: 'private-key',
        },
        changedFields: ['status', 'password', 'api_key'],
        userId,
        organizationId,
        meta: {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      });

      expect(builder.insert).toHaveBeenCalledWith({
        table_name: 'certifications',
        record_id: 'cert-001',
        action: 'UPDATE',
        old_data: {
          status: 'draft',
          password: '[REDACTED]',
        },
        new_data: {
          status: 'active',
          api_key: '[REDACTED]',
        },
        changed_fields: ['status', 'password', 'api_key'],
        user_id: userId,
        organization_id: organizationId,
        ip_address: '127.0.0.1',
        user_agent: 'jest',
      });
    });

    it('swallows database errors so business operations continue', async () => {
      const builder = setupTableMock(mockClient, 'audit_logs');
      setupThenableMock(builder, null, { message: 'insert failed' });

      await expect(
        service.logChange({
          tableName: 'audit_logs',
          recordId: 'audit-001',
          action: 'INSERT',
          newData: { token: 'abc' },
          userId,
          organizationId,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('logInsert', () => {
    it('creates an insert audit entry with changed_fields derived from the payload', async () => {
      const builder = setupTableMock(mockClient, 'audit_logs');
      setupThenableMock(builder, null);

      await service.logInsert(
        'compliance_checks',
        'check-001',
        { status: 'compliant', score: 94 },
        userId,
        organizationId,
      );

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INSERT',
          changed_fields: ['status', 'score'],
          user_id: userId,
          organization_id: organizationId,
        }),
      );
    });
  });

  describe('logUpdate', () => {
    it('records only fields whose values changed', async () => {
      const builder = setupTableMock(mockClient, 'audit_logs');
      setupThenableMock(builder, null);

      await service.logUpdate(
        'certifications',
        'cert-001',
        {
          status: 'draft',
          score: 80,
          nested: { a: 1 },
        },
        {
          status: 'active',
          score: 80,
          nested: { a: 2 },
        },
        userId,
        organizationId,
      );

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          changed_fields: ['status', 'nested'],
          organization_id: organizationId,
        }),
      );
    });

    it('supports edge cases where no fields changed', async () => {
      const builder = setupTableMock(mockClient, 'audit_logs');
      setupThenableMock(builder, null);

      await service.logUpdate(
        'audit_logs',
        'audit-001',
        { status: 'same' },
        { status: 'same' },
        userId,
        organizationId,
      );

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          changed_fields: [],
          organization_id: organizationId,
        }),
      );
    });
  });

  describe('logDelete', () => {
    it('creates a delete audit entry with null new_data', async () => {
      const builder = setupTableMock(mockClient, 'audit_logs');
      setupThenableMock(builder, null);

      await service.logDelete(
        'compliance_evidence',
        'evidence-001',
        { file_url: 'https://example.com/file.jpg', secret: 'hidden' },
        userId,
        organizationId,
      );

      expect(builder.insert).toHaveBeenCalledWith({
        table_name: 'compliance_evidence',
        record_id: 'evidence-001',
        action: 'DELETE',
        old_data: {
          file_url: 'https://example.com/file.jpg',
          secret: '[REDACTED]',
        },
        new_data: null,
        changed_fields: null,
        user_id: userId,
        organization_id: organizationId,
        ip_address: null,
        user_agent: null,
      });
    });
  });
});
