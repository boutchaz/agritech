import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications/notifications.service';
import { DatabaseService } from '../database/database.service';
import { PestAlertsService } from './pest-alerts.service';
import {
  DetectionMethod,
  PestReportSeverity,
} from './dto/create-pest-report.dto';
import { PestReportStatus } from './dto/update-pest-report.dto';
import {
  createMockQueryBuilder,
  createMockSupabaseClient,
  createMockDatabaseService,
  mockQueryResult,
  setupTableMock,
  setupThenableMock,
  MockQueryBuilder,
  MockSupabaseClient,
  MockDatabaseService,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('PestAlertsService', () => {
  let service: PestAlertsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;
  let mockNotificationsService: {
    createNotificationsForUsers: jest.Mock;
    createNotification: jest.Mock;
  };

  const reportId = 'report-123';
  const pestDiseaseId = 'pest-123';
  const alertId = 'alert-123';

  const createReportDto = {
    farm_id: TEST_IDS.farm,
    parcel_id: TEST_IDS.parcel,
    pest_disease_id: pestDiseaseId,
    severity: PestReportSeverity.HIGH,
    affected_area_percentage: 35,
    detection_method: DetectionMethod.VISUAL_INSPECTION,
    photo_urls: ['https://example.com/photo-1.jpg'],
    location: { latitude: 33.5731, longitude: -7.5898 },
    notes: 'Leaf spots observed',
  };

  const createdReport = {
    id: reportId,
    organization_id: TEST_IDS.organization,
    farm_id: TEST_IDS.farm,
    parcel_id: TEST_IDS.parcel,
    reporter_id: TEST_IDS.user,
    pest_disease_id: pestDiseaseId,
    severity: PestReportSeverity.HIGH,
    status: PestReportStatus.PENDING,
    created_at: '2026-04-16T10:00:00.000Z',
    updated_at: '2026-04-16T10:00:00.000Z',
    parcel: { id: TEST_IDS.parcel, name: 'Parcel Alpha' },
    pest_disease: { id: pestDiseaseId, name: 'Powdery Mildew', type: 'disease' },
  };

  const configureFromMocks = (
    tableMap: Record<string, MockQueryBuilder | MockQueryBuilder[]>,
  ): void => {
    const callCounts = new Map<string, number>();

    mockClient.from.mockImplementation((table: string) => {
      const value = tableMap[table];

      if (Array.isArray(value)) {
        const nextIndex = callCounts.get(table) ?? 0;
        callCounts.set(table, nextIndex + 1);
        return value[nextIndex] ?? value[value.length - 1];
      }

      return value ?? createMockQueryBuilder();
    });
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);
    mockNotificationsService = {
      createNotificationsForUsers: jest.fn().mockResolvedValue(undefined),
      createNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PestAlertsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<PestAlertsService>(PestAlertsService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('getLibrary', () => {
    it('returns active library entries ordered by name', async () => {
      const libraryBuilder = setupTableMock(mockClient, 'pest_disease_library');
      const libraryEntries = [
        { id: 'lib-1', name: 'Anthracnose', is_active: true },
        { id: 'lib-2', name: 'Powdery Mildew', is_active: true },
      ];

      setupThenableMock(libraryBuilder, libraryEntries);

      const result = await service.getLibrary(TEST_IDS.organization);

      expect(result).toEqual(libraryEntries);
      expect(libraryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(libraryBuilder.order).toHaveBeenCalledWith('name');
    });

    it('returns an empty array when no entries exist', async () => {
      const libraryBuilder = setupTableMock(mockClient, 'pest_disease_library');
      setupThenableMock(libraryBuilder, null);

      const result = await service.getLibrary(TEST_IDS.organization);

      expect(result).toEqual([]);
    });

    it('throws when the library query fails', async () => {
      const libraryBuilder = setupTableMock(mockClient, 'pest_disease_library');
      setupThenableMock(libraryBuilder, null, { message: 'library failed' });

      await expect(service.getLibrary(TEST_IDS.organization)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getReports', () => {
    it('returns organization reports in descending creation order', async () => {
      const reportsBuilder = setupTableMock(mockClient, 'pest_disease_reports');
      const reports = [createdReport];

      setupThenableMock(reportsBuilder, reports);

      const result = await service.getReports(TEST_IDS.organization);

      expect(result).toEqual(reports);
      expect(reportsBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
      expect(reportsBuilder.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('returns an empty array when the organization has no reports', async () => {
      const reportsBuilder = setupTableMock(mockClient, 'pest_disease_reports');
      setupThenableMock(reportsBuilder, null);

      const result = await service.getReports(TEST_IDS.organization);

      expect(result).toEqual([]);
    });

    it('throws when fetching reports fails', async () => {
      const reportsBuilder = setupTableMock(mockClient, 'pest_disease_reports');
      setupThenableMock(reportsBuilder, null, { message: 'reports failed' });

      await expect(service.getReports(TEST_IDS.organization)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getReport', () => {
    it('returns one report scoped to the organization', async () => {
      const reportsBuilder = setupTableMock(mockClient, 'pest_disease_reports');
      reportsBuilder.single.mockResolvedValue(mockQueryResult(createdReport));

      const result = await service.getReport(TEST_IDS.organization, reportId);

      expect(result).toEqual(createdReport);
      expect(reportsBuilder.eq).toHaveBeenCalledWith('id', reportId);
      expect(reportsBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
    });

    it('throws NotFoundException when the report does not exist', async () => {
      const reportsBuilder = setupTableMock(mockClient, 'pest_disease_reports');
      reportsBuilder.single.mockResolvedValue(
        mockQueryResult(null, { code: 'PGRST116', message: 'not found' }),
      );

      await expect(
        service.getReport(TEST_IDS.organization, reportId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when fetching the report fails unexpectedly', async () => {
      const reportsBuilder = setupTableMock(mockClient, 'pest_disease_reports');
      reportsBuilder.single.mockResolvedValue(
        mockQueryResult(null, { code: '500', message: 'boom' }),
      );

      await expect(
        service.getReport(TEST_IDS.organization, reportId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createReport', () => {
    it('creates a report, preserves organization scoping, and notifies admins', async () => {
      const farmBuilder = createMockQueryBuilder();
      const parcelBuilder = createMockQueryBuilder();
      const libraryBuilder = createMockQueryBuilder();
      const reportBuilder = createMockQueryBuilder();
      const adminsBuilder = createMockQueryBuilder();

      farmBuilder.single.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));
      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.parcel, name: 'Parcel Alpha' }),
      );
      libraryBuilder.single.mockResolvedValue(
        mockQueryResult({ id: pestDiseaseId, name: 'Powdery Mildew', type: 'disease' }),
      );
      reportBuilder.single.mockResolvedValue(mockQueryResult(createdReport));
      setupThenableMock(adminsBuilder, [{ user_id: 'admin-1' }, { user_id: 'admin-2' }]);

      configureFromMocks({
        farms: farmBuilder,
        parcels: parcelBuilder,
        pest_disease_library: libraryBuilder,
        pest_disease_reports: reportBuilder,
        organization_users: adminsBuilder,
      });

      const result = await service.createReport(
        TEST_IDS.user,
        TEST_IDS.organization,
        createReportDto,
      );

      expect(result).toEqual(createdReport);
      expect(farmBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
      expect(reportBuilder.insert).toHaveBeenCalledWith({
        organization_id: TEST_IDS.organization,
        farm_id: TEST_IDS.farm,
        parcel_id: TEST_IDS.parcel,
        reporter_id: TEST_IDS.user,
        pest_disease_id: pestDiseaseId,
        severity: PestReportSeverity.HIGH,
        affected_area_percentage: 35,
        detection_method: DetectionMethod.VISUAL_INSPECTION,
        photo_urls: ['https://example.com/photo-1.jpg'],
        location: 'POINT(-7.5898 33.5731)',
        notes: 'Leaf spots observed',
        status: 'pending',
      });
      expect(mockNotificationsService.createNotificationsForUsers).toHaveBeenCalledWith(
        ['admin-1', 'admin-2'],
        TEST_IDS.organization,
        'general',
        'New disease report: Powdery Mildew',
        'Powdery Mildew detected on Parcel Alpha - Severity: high',
        {
          report_id: reportId,
          pest_disease_id: pestDiseaseId,
          severity: PestReportSeverity.HIGH,
          parcel_id: TEST_IDS.parcel,
        },
      );
    });

    it('defaults optional insert fields when location and photos are omitted', async () => {
      const farmBuilder = createMockQueryBuilder();
      const parcelBuilder = createMockQueryBuilder();
      const libraryBuilder = createMockQueryBuilder();
      const reportBuilder = createMockQueryBuilder();
      const adminsBuilder = createMockQueryBuilder();

      farmBuilder.single.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));
      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.parcel, name: 'Parcel Alpha' }),
      );
      libraryBuilder.single.mockResolvedValue(
        mockQueryResult({ id: pestDiseaseId, name: 'Powdery Mildew', type: 'disease' }),
      );
      reportBuilder.single.mockResolvedValue(mockQueryResult(createdReport));
      setupThenableMock(adminsBuilder, []);

      configureFromMocks({
        farms: farmBuilder,
        parcels: parcelBuilder,
        pest_disease_library: libraryBuilder,
        pest_disease_reports: reportBuilder,
        organization_users: adminsBuilder,
      });

      await service.createReport(TEST_IDS.user, TEST_IDS.organization, {
        ...createReportDto,
        photo_urls: undefined,
        location: undefined,
      });

      expect(reportBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          photo_urls: [],
          location: null,
        }),
      );
      expect(mockNotificationsService.createNotificationsForUsers).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the farm is outside the organization', async () => {
      const farmBuilder = createMockQueryBuilder();
      farmBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'farm missing' }),
      );

      configureFromMocks({ farms: farmBuilder });

      await expect(
        service.createReport(TEST_IDS.user, TEST_IDS.organization, createReportDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the parcel does not belong to the farm', async () => {
      const farmBuilder = createMockQueryBuilder();
      const parcelBuilder = createMockQueryBuilder();

      farmBuilder.single.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));
      parcelBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'parcel missing' }),
      );

      configureFromMocks({
        farms: farmBuilder,
        parcels: parcelBuilder,
      });

      await expect(
        service.createReport(TEST_IDS.user, TEST_IDS.organization, createReportDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the pest or disease does not exist', async () => {
      const farmBuilder = createMockQueryBuilder();
      const parcelBuilder = createMockQueryBuilder();
      const libraryBuilder = createMockQueryBuilder();

      farmBuilder.single.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));
      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.parcel, name: 'Parcel Alpha' }),
      );
      libraryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'pest missing' }),
      );

      configureFromMocks({
        farms: farmBuilder,
        parcels: parcelBuilder,
        pest_disease_library: libraryBuilder,
      });

      await expect(
        service.createReport(TEST_IDS.user, TEST_IDS.organization, createReportDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when report creation fails', async () => {
      const farmBuilder = createMockQueryBuilder();
      const parcelBuilder = createMockQueryBuilder();
      const libraryBuilder = createMockQueryBuilder();
      const reportBuilder = createMockQueryBuilder();

      farmBuilder.single.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));
      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.parcel, name: 'Parcel Alpha' }),
      );
      libraryBuilder.single.mockResolvedValue(
        mockQueryResult({ id: pestDiseaseId, name: 'Powdery Mildew', type: 'disease' }),
      );
      reportBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'insert failed' }),
      );

      configureFromMocks({
        farms: farmBuilder,
        parcels: parcelBuilder,
        pest_disease_library: libraryBuilder,
        pest_disease_reports: reportBuilder,
      });

      await expect(
        service.createReport(TEST_IDS.user, TEST_IDS.organization, createReportDto),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('does not fail report creation when notification dispatch fails', async () => {
      const farmBuilder = createMockQueryBuilder();
      const parcelBuilder = createMockQueryBuilder();
      const libraryBuilder = createMockQueryBuilder();
      const reportBuilder = createMockQueryBuilder();
      const adminsBuilder = createMockQueryBuilder();

      farmBuilder.single.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));
      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.parcel, name: 'Parcel Alpha' }),
      );
      libraryBuilder.single.mockResolvedValue(
        mockQueryResult({ id: pestDiseaseId, name: 'Powdery Mildew', type: 'disease' }),
      );
      reportBuilder.single.mockResolvedValue(mockQueryResult(createdReport));
      setupThenableMock(adminsBuilder, [{ user_id: 'admin-1' }]);
      mockNotificationsService.createNotificationsForUsers.mockRejectedValueOnce(
        new Error('notification failed'),
      );

      configureFromMocks({
        farms: farmBuilder,
        parcels: parcelBuilder,
        pest_disease_library: libraryBuilder,
        pest_disease_reports: reportBuilder,
        organization_users: adminsBuilder,
      });

      await expect(
        service.createReport(TEST_IDS.user, TEST_IDS.organization, createReportDto),
      ).resolves.toEqual(createdReport);
    });
  });

  describe('updateReport', () => {
    it('verifies a report, stamps verifier metadata, and notifies the reporter', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-04-16T12:00:00.000Z'));

      const existingBuilder = createMockQueryBuilder();
      const updateBuilder = createMockQueryBuilder();
      const updatedBuilder = createMockQueryBuilder();
      const reporterBuilder = createMockQueryBuilder();

      existingBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: reportId,
          status: PestReportStatus.PENDING,
          parcel_id: TEST_IDS.parcel,
          pest_disease_id: pestDiseaseId,
        }),
      );
      setupThenableMock(updateBuilder, null);
      updatedBuilder.single.mockResolvedValue(
        mockQueryResult({ ...createdReport, status: PestReportStatus.VERIFIED }),
      );
      reporterBuilder.single.mockResolvedValue(
        mockQueryResult({ reporter_id: TEST_IDS.user }),
      );

      configureFromMocks({
        pest_disease_reports: [
          existingBuilder,
          updateBuilder,
          updatedBuilder,
          reporterBuilder,
        ],
      });

      const result = await service.updateReport(
        TEST_IDS.user,
        TEST_IDS.organization,
        reportId,
        { status: PestReportStatus.VERIFIED, treatment_applied: 'Copper spray' },
      );

      expect(result).toEqual({ ...createdReport, status: PestReportStatus.VERIFIED });
      expect(existingBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
      expect(updateBuilder.update).toHaveBeenCalledWith({
        status: PestReportStatus.VERIFIED,
        treatment_applied: 'Copper spray',
        verified_by: TEST_IDS.user,
        verified_at: '2026-04-16T12:00:00.000Z',
      });
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        userId: TEST_IDS.user,
        organizationId: TEST_IDS.organization,
        type: 'general',
        title: 'Pest report verified',
        message: 'Your pest report has been verified',
        data: { report_id: reportId, status: PestReportStatus.VERIFIED },
      });
    });

    it('updates a non-verified status without verifier metadata', async () => {
      const existingBuilder = createMockQueryBuilder();
      const updateBuilder = createMockQueryBuilder();
      const updatedBuilder = createMockQueryBuilder();

      existingBuilder.single.mockResolvedValue(
        mockQueryResult({ id: reportId, status: PestReportStatus.PENDING }),
      );
      setupThenableMock(updateBuilder, null);
      updatedBuilder.single.mockResolvedValue(
        mockQueryResult({ ...createdReport, status: PestReportStatus.RESOLVED }),
      );

      configureFromMocks({
        pest_disease_reports: [existingBuilder, updateBuilder, updatedBuilder],
      });

      await service.updateReport(
        TEST_IDS.user,
        TEST_IDS.organization,
        reportId,
        { status: PestReportStatus.RESOLVED },
      );

      expect(updateBuilder.update).toHaveBeenCalledWith({
        status: PestReportStatus.RESOLVED,
        treatment_applied: null,
      });
      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the report is missing', async () => {
      const existingBuilder = createMockQueryBuilder();
      existingBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'missing report' }),
      );

      configureFromMocks({ pest_disease_reports: [existingBuilder] });

      await expect(
        service.updateReport(TEST_IDS.user, TEST_IDS.organization, reportId, {
          status: PestReportStatus.VERIFIED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the update query fails', async () => {
      const existingBuilder = createMockQueryBuilder();
      const updateBuilder = createMockQueryBuilder();

      existingBuilder.single.mockResolvedValue(mockQueryResult({ id: reportId }));
      setupThenableMock(updateBuilder, null, { message: 'update failed' });

      configureFromMocks({
        pest_disease_reports: [existingBuilder, updateBuilder],
      });

      await expect(
        service.updateReport(TEST_IDS.user, TEST_IDS.organization, reportId, {
          status: PestReportStatus.TREATED,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws when fetching the updated report fails', async () => {
      const existingBuilder = createMockQueryBuilder();
      const updateBuilder = createMockQueryBuilder();
      const updatedBuilder = createMockQueryBuilder();

      existingBuilder.single.mockResolvedValue(mockQueryResult({ id: reportId }));
      setupThenableMock(updateBuilder, null);
      updatedBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'fetch failed' }),
      );

      configureFromMocks({
        pest_disease_reports: [existingBuilder, updateBuilder, updatedBuilder],
      });

      await expect(
        service.updateReport(TEST_IDS.user, TEST_IDS.organization, reportId, {
          status: PestReportStatus.TREATED,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('does not fail the update when the reporter notification fails', async () => {
      const existingBuilder = createMockQueryBuilder();
      const updateBuilder = createMockQueryBuilder();
      const updatedBuilder = createMockQueryBuilder();
      const reporterBuilder = createMockQueryBuilder();

      existingBuilder.single.mockResolvedValue(mockQueryResult({ id: reportId }));
      setupThenableMock(updateBuilder, null);
      updatedBuilder.single.mockResolvedValue(
        mockQueryResult({ ...createdReport, status: PestReportStatus.TREATED }),
      );
      reporterBuilder.single.mockResolvedValue(
        mockQueryResult({ reporter_id: TEST_IDS.user }),
      );
      mockNotificationsService.createNotification.mockRejectedValueOnce(
        new Error('notify failed'),
      );

      configureFromMocks({
        pest_disease_reports: [
          existingBuilder,
          updateBuilder,
          updatedBuilder,
          reporterBuilder,
        ],
      });

      await expect(
        service.updateReport(TEST_IDS.user, TEST_IDS.organization, reportId, {
          status: PestReportStatus.TREATED,
        }),
      ).resolves.toEqual({ ...createdReport, status: PestReportStatus.TREATED });
    });
  });

  describe('deleteReport', () => {
    it('deletes a report scoped to the organization', async () => {
      const deleteBuilder = setupTableMock(mockClient, 'pest_disease_reports');
      setupThenableMock(deleteBuilder, null);

      await expect(
        service.deleteReport(TEST_IDS.organization, reportId),
      ).resolves.toBeUndefined();

      expect(deleteBuilder.delete).toHaveBeenCalled();
      expect(deleteBuilder.eq).toHaveBeenCalledWith('id', reportId);
      expect(deleteBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
    });

    it('throws when deletion fails', async () => {
      const deleteBuilder = setupTableMock(mockClient, 'pest_disease_reports');
      setupThenableMock(deleteBuilder, null, { message: 'delete failed' });

      await expect(
        service.deleteReport(TEST_IDS.organization, reportId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('escalateToAlert', () => {
    it('creates a performance alert and notifies admins', async () => {
      const existingReportBuilder = createMockQueryBuilder();
      const libraryBuilder = createMockQueryBuilder();
      const alertBuilder = createMockQueryBuilder();
      const adminsBuilder = createMockQueryBuilder();

      existingReportBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: reportId,
          parcel_id: TEST_IDS.parcel,
          pest_disease_id: pestDiseaseId,
          severity: PestReportSeverity.CRITICAL,
          notes: 'Escalate immediately',
        }),
      );
      libraryBuilder.single.mockResolvedValue(
        mockQueryResult({ name: 'Powdery Mildew', type: 'disease' }),
      );
      alertBuilder.single.mockResolvedValue(mockQueryResult({ id: alertId }));
      setupThenableMock(adminsBuilder, [{ user_id: 'admin-1' }]);

      configureFromMocks({
        pest_disease_reports: existingReportBuilder,
        pest_disease_library: libraryBuilder,
        performance_alerts: alertBuilder,
        organization_users: adminsBuilder,
      });

      const result = await service.escalateToAlert(
        TEST_IDS.user,
        TEST_IDS.organization,
        reportId,
      );

      expect(result).toEqual({ alert_id: alertId });
      expect(existingReportBuilder.eq).toHaveBeenCalledWith(
        'organization_id',
        TEST_IDS.organization,
      );
      expect(alertBuilder.insert).toHaveBeenCalledWith({
        organization_id: TEST_IDS.organization,
        parcel_id: TEST_IDS.parcel,
        alert_type: 'pest_disease',
        severity: PestReportSeverity.CRITICAL,
        title: 'Powdery Mildew Alert',
        description: 'Escalate immediately',
        source_report_id: reportId,
        status: 'active',
      });
      expect(mockNotificationsService.createNotificationsForUsers).toHaveBeenCalledWith(
        ['admin-1'],
        TEST_IDS.organization,
        'general',
        'Pest report escalated to alert',
        'Powdery Mildew report has been escalated to a performance alert',
        {
          report_id: reportId,
          alert_id: alertId,
          severity: PestReportSeverity.CRITICAL,
        },
      );
    });

    it('throws NotFoundException when the source report is missing', async () => {
      const existingReportBuilder = createMockQueryBuilder();
      existingReportBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'missing report' }),
      );

      configureFromMocks({ pest_disease_reports: existingReportBuilder });

      await expect(
        service.escalateToAlert(TEST_IDS.user, TEST_IDS.organization, reportId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when alert creation fails', async () => {
      const existingReportBuilder = createMockQueryBuilder();
      const libraryBuilder = createMockQueryBuilder();
      const alertBuilder = createMockQueryBuilder();

      existingReportBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: reportId,
          parcel_id: TEST_IDS.parcel,
          pest_disease_id: pestDiseaseId,
          severity: PestReportSeverity.CRITICAL,
          notes: null,
        }),
      );
      libraryBuilder.single.mockResolvedValue(
        mockQueryResult({ name: 'Powdery Mildew', type: 'disease' }),
      );
      alertBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'alert insert failed' }),
      );

      configureFromMocks({
        pest_disease_reports: existingReportBuilder,
        pest_disease_library: libraryBuilder,
        performance_alerts: alertBuilder,
      });

      await expect(
        service.escalateToAlert(TEST_IDS.user, TEST_IDS.organization, reportId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('does not fail escalation when admin notification fails', async () => {
      const existingReportBuilder = createMockQueryBuilder();
      const libraryBuilder = createMockQueryBuilder();
      const alertBuilder = createMockQueryBuilder();
      const adminsBuilder = createMockQueryBuilder();

      existingReportBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: reportId,
          parcel_id: TEST_IDS.parcel,
          pest_disease_id: pestDiseaseId,
          severity: PestReportSeverity.CRITICAL,
          notes: 'Escalate immediately',
        }),
      );
      libraryBuilder.single.mockResolvedValue(
        mockQueryResult({ name: 'Powdery Mildew', type: 'disease' }),
      );
      alertBuilder.single.mockResolvedValue(mockQueryResult({ id: alertId }));
      setupThenableMock(adminsBuilder, [{ user_id: 'admin-1' }]);
      mockNotificationsService.createNotificationsForUsers.mockRejectedValueOnce(
        new Error('notify failed'),
      );

      configureFromMocks({
        pest_disease_reports: existingReportBuilder,
        pest_disease_library: libraryBuilder,
        performance_alerts: alertBuilder,
        organization_users: adminsBuilder,
      });

      await expect(
        service.escalateToAlert(TEST_IDS.user, TEST_IDS.organization, reportId),
      ).resolves.toEqual({ alert_id: alertId });
    });
  });

  describe('getDiseaseRisk', () => {
    it('returns risk assessment using organization-scoped parcel and latest weather', async () => {
      const parcelBuilder = createMockQueryBuilder();
      const diseasesBuilder = createMockQueryBuilder();
      const weatherBuilder = createMockQueryBuilder();

      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.parcel,
          crop_type: 'olive',
          farm_id: TEST_IDS.farm,
          farms: { organization_id: TEST_IDS.organization },
        }),
      );
      setupThenableMock(diseasesBuilder, [
        {
          disease_name: 'Leaf Spot',
          disease_name_fr: 'Tache foliaire',
          pathogen_name: 'Fungus A',
          disease_type: 'fungal',
          severity: 'high',
          temperature_min: 18,
          temperature_max: 28,
          humidity_threshold: 60,
          treatment_product: 'Copper',
          treatment_dose: '2L/ha',
          treatment_timing: 'Morning',
          satellite_signal: 'ndvi_drop',
        },
        {
          disease_name: 'Cold Stress',
          disease_name_fr: null,
          pathogen_name: null,
          disease_type: 'abiotic',
          severity: 'medium',
          temperature_min: 1,
          temperature_max: 10,
          humidity_threshold: null,
          treatment_product: null,
          treatment_dose: null,
          treatment_timing: null,
          satellite_signal: null,
        },
      ]);
      weatherBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          temperature_2m_mean: '22.5',
          relative_humidity_2m_mean: '75',
          date: '2026-04-15',
        }),
      );

      configureFromMocks({
        parcels: parcelBuilder,
        crop_diseases: diseasesBuilder,
        weather_daily_data: weatherBuilder,
      });

      const result = await service.getDiseaseRisk(
        TEST_IDS.parcel,
        TEST_IDS.organization,
      );

      expect(result).toEqual({
        parcel_id: TEST_IDS.parcel,
        crop_type: 'olive',
        risks: [
          {
            disease_name: 'Leaf Spot',
            disease_name_fr: 'Tache foliaire',
            pathogen_name: 'Fungus A',
            disease_type: 'fungal',
            severity: 'high',
            risk_active: true,
            temperature_range: { min: 18, max: 28 },
            humidity_threshold: 60,
            treatment_product: 'Copper',
            treatment_dose: '2L/ha',
            treatment_timing: 'Morning',
            satellite_signal: 'ndvi_drop',
          },
          {
            disease_name: 'Cold Stress',
            disease_name_fr: null,
            pathogen_name: null,
            disease_type: 'abiotic',
            severity: 'medium',
            risk_active: false,
            temperature_range: { min: 1, max: 10 },
            humidity_threshold: null,
            treatment_product: null,
            treatment_dose: null,
            treatment_timing: null,
            satellite_signal: null,
          },
        ],
        weather: {
          temperature: 22.5,
          humidity: 75,
          date: '2026-04-15',
        },
      });
      expect(parcelBuilder.eq).toHaveBeenCalledWith('id', TEST_IDS.parcel);
      expect(diseasesBuilder.eq).toHaveBeenCalledWith('crop_type_name', 'olive');
      expect(weatherBuilder.eq).toHaveBeenCalledWith('parcel_id', TEST_IDS.parcel);
      expect(weatherBuilder.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(weatherBuilder.limit).toHaveBeenCalledWith(1);
    });

    it('defaults crop type to olive and returns null weather when latest weather lookup fails', async () => {
      const parcelBuilder = createMockQueryBuilder();
      const diseasesBuilder = createMockQueryBuilder();
      const weatherBuilder = createMockQueryBuilder();

      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.parcel,
          crop_type: null,
          farm_id: TEST_IDS.farm,
          farms: [{ organization_id: TEST_IDS.organization.toUpperCase() }],
        }),
      );
      setupThenableMock(diseasesBuilder, []);
      weatherBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult(null, { message: 'weather unavailable' }),
      );

      configureFromMocks({
        parcels: parcelBuilder,
        crop_diseases: diseasesBuilder,
        weather_daily_data: weatherBuilder,
      });

      const result = await service.getDiseaseRisk(
        TEST_IDS.parcel,
        TEST_IDS.organization,
      );

      expect(result).toEqual({
        parcel_id: TEST_IDS.parcel,
        crop_type: 'olive',
        risks: [],
        weather: {
          temperature: null,
          humidity: null,
          date: null,
        },
      });
      expect(diseasesBuilder.eq).toHaveBeenCalledWith('crop_type_name', 'olive');
    });

    it('throws NotFoundException when the parcel does not exist', async () => {
      const parcelBuilder = createMockQueryBuilder();
      parcelBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'missing parcel' }),
      );

      configureFromMocks({ parcels: parcelBuilder });

      await expect(
        service.getDiseaseRisk(TEST_IDS.parcel, TEST_IDS.organization),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the parcel belongs to another organization', async () => {
      const parcelBuilder = createMockQueryBuilder();
      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.parcel,
          crop_type: 'olive',
          farm_id: TEST_IDS.farm,
          farms: { organization_id: 'other-org' },
        }),
      );

      configureFromMocks({ parcels: parcelBuilder });

      await expect(
        service.getDiseaseRisk(TEST_IDS.parcel, TEST_IDS.organization),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when crop disease lookup fails', async () => {
      const parcelBuilder = createMockQueryBuilder();
      const diseasesBuilder = createMockQueryBuilder();

      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.parcel,
          crop_type: 'olive',
          farm_id: TEST_IDS.farm,
          farms: { organization_id: TEST_IDS.organization },
        }),
      );
      setupThenableMock(diseasesBuilder, null, { message: 'disease lookup failed' });

      configureFromMocks({
        parcels: parcelBuilder,
        crop_diseases: diseasesBuilder,
      });

      await expect(
        service.getDiseaseRisk(TEST_IDS.parcel, TEST_IDS.organization),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
