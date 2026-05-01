import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ComplianceReportsService } from './compliance-reports.service';
import { ComplianceService } from './compliance.service';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('ComplianceReportsService', () => {
  let service: ComplianceReportsService;
  let mockComplianceService: Partial<ComplianceService>;

  const organizationId = TEST_IDS.organization;
  const certificationId = 'cert-gg-001';

  const globalGapCertification = {
    id: certificationId,
    organization_id: organizationId,
    certification_type: 'GlobalGAP',
    certification_number: 'GGN-001',
    issued_date: '2026-01-15',
    expiry_date: '2027-01-15',
    status: 'active',
    issuing_body: 'Control Union',
    scope: 'All citrus parcels',
  };

  const nonGlobalGapCertification = {
    ...globalGapCertification,
    id: 'cert-iso-001',
    certification_type: 'ISO22000',
    certification_number: 'ISO-001',
  };

  const requirements = [
    {
      id: 'req-001',
      certification_type: 'GlobalGAP',
      requirement_code: 'AF-1.1',
      requirement_description: 'Farm management plan documented',
      category: 'Management',
      is_critical: true,
    },
    {
      id: 'req-002',
      certification_type: 'GlobalGAP',
      requirement_code: 'AF-2.1',
      requirement_description: 'Worker training records maintained',
      category: 'Workers',
      is_critical: false,
    },
  ];

  const compliantCheck = {
    id: 'check-001',
    certification_id: certificationId,
    check_type: 'traceability',
    check_date: '2026-03-15',
    status: 'compliant',
    score: 92,
    auditor_name: 'Auditor Dupont',
    findings: [],
    corrective_actions: [],
  };

  const nonCompliantCheck = {
    id: 'check-002',
    certification_id: certificationId,
    check_type: 'hygiene',
    check_date: '2026-02-20',
    status: 'non_compliant',
    score: 55,
    auditor_name: 'Auditor Martin',
    findings: [
      { description: 'Missing hygiene signage in processing area', severity: 'major' },
    ],
    corrective_actions: [
      { action: 'Install required signage', status: 'in_progress' },
    ],
  };

  beforeEach(async () => {
    mockComplianceService = {
      findOneCertification: jest.fn(),
      findRequirements: jest.fn(),
      findAllChecks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceReportsService,
        { provide: ComplianceService, useValue: mockComplianceService },
      ],
    }).compile();

    service = module.get<ComplianceReportsService>(ComplianceReportsService);
  });

  describe('generateGlobalGAPReport', () => {
    it('should generate PDF report for GlobalGAP certification with compliant checks', async () => {
      (mockComplianceService.findOneCertification as jest.Mock).mockResolvedValueOnce(
        globalGapCertification,
      );
      (mockComplianceService.findRequirements as jest.Mock).mockResolvedValueOnce(requirements);
      (mockComplianceService.findAllChecks as jest.Mock).mockResolvedValueOnce([compliantCheck]);

      const result = await service.generateGlobalGAPReport(certificationId, organizationId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate report with non-compliant checks and corrective actions', async () => {
      (mockComplianceService.findOneCertification as jest.Mock).mockResolvedValueOnce(
        globalGapCertification,
      );
      (mockComplianceService.findRequirements as jest.Mock).mockResolvedValueOnce(requirements);
      (mockComplianceService.findAllChecks as jest.Mock).mockResolvedValueOnce([nonCompliantCheck]);

      const result = await service.generateGlobalGAPReport(certificationId, organizationId);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate report with mixed checks', async () => {
      (mockComplianceService.findOneCertification as jest.Mock).mockResolvedValueOnce(
        globalGapCertification,
      );
      (mockComplianceService.findRequirements as jest.Mock).mockResolvedValueOnce(requirements);
      (mockComplianceService.findAllChecks as jest.Mock).mockResolvedValueOnce([
        compliantCheck,
        nonCompliantCheck,
      ]);

      const result = await service.generateGlobalGAPReport(certificationId, organizationId);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate report with no compliance checks', async () => {
      (mockComplianceService.findOneCertification as jest.Mock).mockResolvedValueOnce(
        globalGapCertification,
      );
      (mockComplianceService.findRequirements as jest.Mock).mockResolvedValueOnce(requirements);
      (mockComplianceService.findAllChecks as jest.Mock).mockResolvedValueOnce([]);

      const result = await service.generateGlobalGAPReport(certificationId, organizationId);

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw NotFoundException if certification not found', async () => {
      (mockComplianceService.findOneCertification as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.generateGlobalGAPReport('nonexistent', organizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-GlobalGAP certification types', async () => {
      (mockComplianceService.findOneCertification as jest.Mock).mockResolvedValueOnce(
        nonGlobalGapCertification,
      );

      await expect(
        service.generateGlobalGAPReport('cert-iso-001', organizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (mockComplianceService.findOneCertification as jest.Mock).mockRejectedValueOnce(
        new Error('Unexpected DB error'),
      );

      await expect(
        service.generateGlobalGAPReport(certificationId, organizationId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
