import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { DatabaseService } from '../database/database.service';
import {
  CertificationStatus,
  CertificationType,
} from './dto/create-certification.dto';
import {
  ComplianceCheckStatus,
  ComplianceCheckType,
} from './dto/create-compliance-check.dto';
import { EvidenceType } from './dto/create-evidence.dto';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  setupTableMock,
  setupThenableMock,
  MockDatabaseService,
  MockQueryBuilder,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = TEST_IDS.organization;
  const certificationId = '11111111-1111-1111-1111-111111111111';
  const checkId = '22222222-2222-2222-2222-222222222222';

  const certification = {
    id: certificationId,
    organization_id: organizationId,
    certification_type: CertificationType.GLOBALGAP,
    certification_number: 'GGN-001',
    issued_date: '2026-01-01',
    expiry_date: '2026-12-31',
    status: CertificationStatus.ACTIVE,
    issuing_body: 'Control Union',
    scope: 'Citrus parcels',
    documents: [],
    audit_schedule: {},
  };

  const complianceCheck = {
    id: checkId,
    organization_id: organizationId,
    certification_id: certificationId,
    check_type: ComplianceCheckType.TRACEABILITY,
    check_date: '2026-02-01',
    status: ComplianceCheckStatus.COMPLIANT,
    findings: [],
    corrective_actions: [],
    next_check_date: '2026-03-01',
    auditor_name: 'Auditor 1',
    score: 95,
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllCertifications', () => {
    it('returns certifications filtered by organization', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      setupThenableMock(builder, [certification]);

      const result = await service.findAllCertifications(organizationId);

      expect(result).toEqual([certification]);
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(builder.order).toHaveBeenCalledWith('expiry_date', {
        ascending: true,
      });
    });

    it('returns an empty array when no certifications exist', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      setupThenableMock(builder, null);

      await expect(service.findAllCertifications(organizationId)).resolves.toEqual(
        [],
      );
    });

    it('throws when fetching certifications fails', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      setupThenableMock(builder, null, { message: 'db failed' });

      await expect(service.findAllCertifications(organizationId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOneCertification', () => {
    it('returns a certification when found in the organization', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      builder.single.mockResolvedValue(mockQueryResult(certification));

      const result = await service.findOneCertification(
        organizationId,
        certificationId,
      );

      expect(result).toEqual(certification);
      expect(builder.eq).toHaveBeenCalledWith('id', certificationId);
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
    });

    it('throws NotFoundException when certification does not exist', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      builder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'not found', code: 'PGRST116' }),
      );

      await expect(
        service.findOneCertification(organizationId, certificationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws InternalServerErrorException on unexpected query failure', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      builder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'boom', code: 'XX000' }),
      );

      await expect(
        service.findOneCertification(organizationId, certificationId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createCertification', () => {
    const dto = {
      certification_type: CertificationType.GLOBALGAP,
      certification_number: 'GGN-001',
      issued_date: '2026-01-01',
      expiry_date: '2026-12-31',
      status: CertificationStatus.ACTIVE,
      issuing_body: 'Control Union',
      scope: 'Citrus parcels',
    };

    it('creates a certification with organization context and schedules reminders', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      const createdCertification = {
        ...certification,
        audit_schedule: { next_audit_date: '2026-11-30' },
      };
      builder.single
        .mockResolvedValueOnce(mockQueryResult(null))
        .mockResolvedValueOnce(mockQueryResult(createdCertification));

      const scheduleSpy = jest
        .spyOn(service, 'scheduleAuditReminders')
        .mockResolvedValue(undefined);

      const result = await service.createCertification(organizationId, dto);

      expect(result).toEqual(createdCertification);
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(builder.insert).toHaveBeenCalledWith({
        organization_id: organizationId,
        certification_type: dto.certification_type,
        certification_number: dto.certification_number,
        issued_date: dto.issued_date,
        expiry_date: dto.expiry_date,
        status: dto.status,
        issuing_body: dto.issuing_body,
        scope: dto.scope,
        documents: [],
        audit_schedule: {},
      });
      expect(scheduleSpy).toHaveBeenCalledWith(createdCertification);
    });

    it('rejects invalid date ranges before querying the database', async () => {
      await expect(
        service.createCertification(organizationId, {
          ...dto,
          issued_date: '2026-12-31',
          expiry_date: '2026-12-01',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockClient.from).not.toHaveBeenCalled();
    });

    it('rejects duplicate certifications within the same organization', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      builder.single.mockResolvedValueOnce(mockQueryResult({ id: certificationId }));

      await expect(service.createCertification(organizationId, dto)).rejects.toThrow(
        BadRequestException,
      );

      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(builder.eq).toHaveBeenCalledWith(
        'certification_number',
        dto.certification_number,
      );
    });

    it('throws when insertion fails', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      builder.single
        .mockResolvedValueOnce(mockQueryResult(null))
        .mockResolvedValueOnce(mockQueryResult(null, { message: 'insert failed' }));

      await expect(service.createCertification(organizationId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateCertification', () => {
    it('updates a certification inside the same organization', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      const updateDto = {
        status: CertificationStatus.PENDING_RENEWAL,
        audit_schedule: { next_audit_date: '2026-10-15' },
      };
      const updatedCertification = { ...certification, ...updateDto };

      builder.single
        .mockResolvedValueOnce(mockQueryResult({ id: certificationId }))
        .mockResolvedValueOnce(mockQueryResult(updatedCertification));

      const scheduleSpy = jest
        .spyOn(service, 'scheduleAuditReminders')
        .mockResolvedValue(undefined);

      const result = await service.updateCertification(
        organizationId,
        certificationId,
        updateDto,
      );

      expect(result).toEqual(updatedCertification);
      expect(builder.update).toHaveBeenCalledWith(updateDto);
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(scheduleSpy).toHaveBeenCalledWith(updatedCertification);
    });

    it('throws NotFoundException when certification is outside the organization', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      builder.single.mockResolvedValueOnce(mockQueryResult(null));

      await expect(
        service.updateCertification(organizationId, certificationId, {
          status: CertificationStatus.EXPIRED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects invalid update date ranges', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      builder.single.mockResolvedValueOnce(mockQueryResult({ id: certificationId }));

      await expect(
        service.updateCertification(organizationId, certificationId, {
          issued_date: '2026-12-10',
          expiry_date: '2026-12-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when update query fails', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      builder.single
        .mockResolvedValueOnce(mockQueryResult({ id: certificationId }))
        .mockResolvedValueOnce(mockQueryResult(null, { message: 'update failed' }));

      await expect(
        service.updateCertification(organizationId, certificationId, {
          status: CertificationStatus.EXPIRED,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('removeCertification', () => {
    it('deletes a certification with organization filtering', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      setupThenableMock(builder, null);

      await expect(
        service.removeCertification(organizationId, certificationId),
      ).resolves.toBeUndefined();

      expect(builder.eq).toHaveBeenCalledWith('id', certificationId);
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
    });

    it('throws when delete fails', async () => {
      const builder = setupTableMock(mockClient, 'certifications');
      setupThenableMock(builder, null, { message: 'delete failed' });

      await expect(
        service.removeCertification(organizationId, certificationId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAllChecks', () => {
    it('returns compliance checks filtered by organization', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      setupThenableMock(builder, [complianceCheck]);

      const result = await service.findAllChecks(organizationId);

      expect(result).toEqual([complianceCheck]);
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(builder.order).toHaveBeenCalledWith('check_date', {
        ascending: false,
      });
    });

    it('returns an empty array when no checks exist', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      setupThenableMock(builder, null);

      await expect(service.findAllChecks(organizationId)).resolves.toEqual([]);
    });

    it('throws when fetching checks fails', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      setupThenableMock(builder, null, { message: 'select failed' });

      await expect(service.findAllChecks(organizationId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOneCheck', () => {
    it('returns one compliance check for the organization', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      builder.single.mockResolvedValue(mockQueryResult(complianceCheck));

      const result = await service.findOneCheck(organizationId, checkId);

      expect(result).toEqual(complianceCheck);
      expect(builder.eq).toHaveBeenCalledWith('id', checkId);
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
    });

    it('throws NotFoundException when a check does not exist', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      builder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'not found', code: 'PGRST116' }),
      );

      await expect(service.findOneCheck(organizationId, checkId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws InternalServerErrorException on unexpected errors', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      builder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'boom', code: 'XX000' }),
      );

      await expect(service.findOneCheck(organizationId, checkId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('createCheck', () => {
    const dto = {
      certification_id: certificationId,
      check_type: ComplianceCheckType.TRACEABILITY,
      check_date: '2026-02-01',
      status: ComplianceCheckStatus.COMPLIANT,
      next_check_date: '2026-03-01',
      auditor_name: 'Auditor 1',
      score: 95,
    };

    it('creates a compliance check after validating certification ownership', async () => {
      const certificationBuilder = createMockQueryBuilder();
      certificationBuilder.single.mockResolvedValue(
        mockQueryResult({ id: certificationId, organization_id: organizationId }),
      );

      const checksBuilder = createMockQueryBuilder();
      checksBuilder.single.mockResolvedValue(mockQueryResult(complianceCheck));

      mockClient.from.mockImplementation((table: string): MockQueryBuilder => {
        if (table === 'certifications') {
          return certificationBuilder;
        }

        if (table === 'compliance_checks') {
          return checksBuilder;
        }

        return createMockQueryBuilder();
      });

      const result = await service.createCheck(organizationId, dto);

      expect(result).toEqual(complianceCheck);
      expect(certificationBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(checksBuilder.insert).toHaveBeenCalledWith({
        organization_id: organizationId,
        certification_id: dto.certification_id,
        check_type: dto.check_type,
        check_date: dto.check_date,
        status: dto.status,
        findings: [],
        corrective_actions: [],
        next_check_date: dto.next_check_date,
        auditor_name: dto.auditor_name,
        score: dto.score,
      });
    });

    it('throws BadRequestException when certification is outside the organization', async () => {
      const certificationBuilder = setupTableMock(mockClient, 'certifications');
      certificationBuilder.single.mockResolvedValue(mockQueryResult(null));

      await expect(service.createCheck(organizationId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when compliance check insert fails', async () => {
      const certificationBuilder = createMockQueryBuilder();
      certificationBuilder.single.mockResolvedValue(
        mockQueryResult({ id: certificationId, organization_id: organizationId }),
      );

      const checksBuilder = createMockQueryBuilder();
      checksBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'insert failed' }),
      );

      mockClient.from.mockImplementation((table: string): MockQueryBuilder => {
        if (table === 'certifications') {
          return certificationBuilder;
        }

        if (table === 'compliance_checks') {
          return checksBuilder;
        }

        return createMockQueryBuilder();
      });

      await expect(service.createCheck(organizationId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateCheck', () => {
    it('updates an existing organization check', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      const updatedCheck = {
        ...complianceCheck,
        status: ComplianceCheckStatus.NON_COMPLIANT,
      };
      builder.single
        .mockResolvedValueOnce(mockQueryResult({ id: checkId }))
        .mockResolvedValueOnce(mockQueryResult(updatedCheck));

      const result = await service.updateCheck(organizationId, checkId, {
        status: ComplianceCheckStatus.NON_COMPLIANT,
      });

      expect(result).toEqual(updatedCheck);
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(builder.update).toHaveBeenCalledWith({
        status: ComplianceCheckStatus.NON_COMPLIANT,
      });
    });

    it('throws NotFoundException when check is missing', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      builder.single.mockResolvedValueOnce(mockQueryResult(null));

      await expect(
        service.updateCheck(organizationId, checkId, {
          status: ComplianceCheckStatus.COMPLIANT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when update fails', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      builder.single
        .mockResolvedValueOnce(mockQueryResult({ id: checkId }))
        .mockResolvedValueOnce(mockQueryResult(null, { message: 'update failed' }));

      await expect(
        service.updateCheck(organizationId, checkId, { score: 99 }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('removeCheck', () => {
    it('deletes a compliance check with organization scoping', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      setupThenableMock(builder, null);

      await expect(service.removeCheck(organizationId, checkId)).resolves.toBeUndefined();

      expect(builder.eq).toHaveBeenCalledWith('id', checkId);
      expect(builder.eq).toHaveBeenCalledWith('organization_id', organizationId);
    });

    it('throws when deletion fails', async () => {
      const builder = setupTableMock(mockClient, 'compliance_checks');
      setupThenableMock(builder, null, { message: 'delete failed' });

      await expect(service.removeCheck(organizationId, checkId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('createEvidence', () => {
    const dto = {
      compliance_check_id: checkId,
      evidence_type: EvidenceType.PHOTO,
      file_url: 'https://example.com/evidence.jpg',
      description: 'Field photo',
      uploaded_by: '33333333-3333-3333-3333-333333333333',
    };

    it('creates evidence after validating organization ownership of the check', async () => {
      const checkBuilder = createMockQueryBuilder();
      checkBuilder.single.mockResolvedValue(
        mockQueryResult({ id: checkId, organization_id: organizationId }),
      );

      const evidence = {
        id: 'evidence-001',
        ...dto,
      };
      const evidenceBuilder = createMockQueryBuilder();
      evidenceBuilder.single.mockResolvedValue(mockQueryResult(evidence));

      mockClient.from.mockImplementation((table: string): MockQueryBuilder => {
        if (table === 'compliance_checks') {
          return checkBuilder;
        }

        if (table === 'compliance_evidence') {
          return evidenceBuilder;
        }

        return createMockQueryBuilder();
      });

      const result = await service.createEvidence(organizationId, dto);

      expect(result).toEqual(evidence);
      expect(checkBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(evidenceBuilder.insert).toHaveBeenCalledWith({
        compliance_check_id: dto.compliance_check_id,
        evidence_type: dto.evidence_type,
        file_url: dto.file_url,
        description: dto.description,
        uploaded_by: dto.uploaded_by,
      });
    });

    it('throws BadRequestException when the compliance check is not in the organization', async () => {
      const checkBuilder = setupTableMock(mockClient, 'compliance_checks');
      checkBuilder.single.mockResolvedValue(mockQueryResult(null));

      await expect(service.createEvidence(organizationId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when evidence insertion fails', async () => {
      const checkBuilder = createMockQueryBuilder();
      checkBuilder.single.mockResolvedValue(
        mockQueryResult({ id: checkId, organization_id: organizationId }),
      );

      const evidenceBuilder = createMockQueryBuilder();
      evidenceBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'insert failed' }),
      );

      mockClient.from.mockImplementation((table: string): MockQueryBuilder => {
        if (table === 'compliance_checks') {
          return checkBuilder;
        }

        if (table === 'compliance_evidence') {
          return evidenceBuilder;
        }

        return createMockQueryBuilder();
      });

      await expect(service.createEvidence(organizationId, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
