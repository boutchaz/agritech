import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceRemindersService } from './compliance-reminders.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import {
  createMockDatabaseService,
  createMockSupabaseClient,
  createMockQueryBuilder,
  MockDatabaseService,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';
import { NotificationType } from '../notifications/dto/notification.dto';

function thenableProxy(data: any, error: any = null) {
  const result = { data, error };
  const promise = Promise.resolve(result);
  const builder = createMockQueryBuilder();
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === 'then') return promise.then.bind(promise);
      const val = (target as any)[prop];
      if (typeof val === 'function') {
        return (...args: any[]) => {
          val.apply(target, args);
          return thenableProxy(data, error);
        };
      }
      return val;
    },
  });
}

describe('ComplianceRemindersService', () => {
  let service: ComplianceRemindersService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;
  let mockNotificationsService: Partial<NotificationsService>;
  let mockEmailService: Partial<EmailService>;

  const organizationId = TEST_IDS.organization;

  const mockCertification = {
    id: 'cert-001',
    certification_type: 'GlobalGAP',
    certification_number: 'GGN-001',
    audit_schedule: { next_audit_date: '2026-05-15' },
  };

  const mockReminder = {
    id: 'reminder-001',
    certification_id: 'cert-001',
    organization_id: organizationId,
    reminder_type: '14_days',
    scheduled_for: new Date().toISOString(),
    sent_at: null,
    certification: mockCertification,
  };

  const mockAdminUser = {
    user_id: 'admin-001',
    user: [{ id: 'admin-001', email: 'admin@farm.ma', first_name: 'Karim' }],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-001' }),
    };

    mockEmailService = {
      sendByType: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceRemindersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<ComplianceRemindersService>(ComplianceRemindersService);
  });

  describe('checkAuditReminders', () => {
    it('should process due reminders and send notifications to admins', async () => {
      const tableMocks: Record<string, any> = {
        audit_reminders: thenableProxy([mockReminder]),
        roles: thenableProxy([{ id: 'role-001' }]),
        organization_users: thenableProxy([mockAdminUser]),
        user_notification_preferences: createMockQueryBuilder(),
      };
      tableMocks.user_notification_preferences.eq.mockReturnValue(tableMocks.user_notification_preferences);
      tableMocks.user_notification_preferences.maybeSingle.mockResolvedValueOnce({
        data: { audit_reminders_enabled: true },
        error: null,
      });

      mockClient.from.mockImplementation((table: string) => tableMocks[table] || createMockQueryBuilder());

      await service.checkAuditReminders();

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-001',
          organizationId,
          type: NotificationType.AUDIT_REMINDER,
        }),
      );
    });

    it('should skip reminders when query returns error', async () => {
      mockClient.from.mockImplementation(() => thenableProxy(null, { message: 'DB error' }));

      await service.checkAuditReminders();

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should handle empty reminders list', async () => {
      mockClient.from.mockImplementation(() => thenableProxy([]));

      await service.checkAuditReminders();

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should skip sending when admin has audit_reminders_enabled false', async () => {
      const prefsBuilder = createMockQueryBuilder();
      prefsBuilder.eq.mockReturnValue(prefsBuilder);
      prefsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { audit_reminders_enabled: false },
        error: null,
      });

      const tableMocks: Record<string, any> = {
        audit_reminders: thenableProxy([mockReminder]),
        roles: thenableProxy([{ id: 'role-001' }]),
        organization_users: thenableProxy([mockAdminUser]),
        user_notification_preferences: prefsBuilder,
      };

      mockClient.from.mockImplementation((table: string) => tableMocks[table] || createMockQueryBuilder());

      await service.checkAuditReminders();

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('checkCertificationExpiry', () => {
    it('should send expiry notifications for certifications expiring within tracked windows', async () => {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const expiringCert = {
        id: 'cert-002',
        organization_id: organizationId,
        certification_type: 'HACCP',
        certification_number: 'HACCP-002',
        status: 'active',
        expiry_date: sevenDaysLater.toISOString(),
      };

      const prefsBuilder = createMockQueryBuilder();
      prefsBuilder.eq.mockReturnValue(prefsBuilder);
      prefsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { certification_expiry_reminders: true },
        error: null,
      });

      const tableMocks: Record<string, any> = {
        certifications: thenableProxy([expiringCert]),
        roles: thenableProxy([{ id: 'role-001' }]),
        organization_users: thenableProxy([mockAdminUser]),
        user_notification_preferences: prefsBuilder,
      };

      mockClient.from.mockImplementation((table: string) => tableMocks[table] || createMockQueryBuilder());

      await service.checkCertificationExpiry();

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CERTIFICATION_EXPIRY,
          data: expect.objectContaining({
            certificationId: expiringCert.id,
            daysUntilExpiry: expect.any(Number),
          }),
        }),
      );
    });

    it('should skip when no certifications are expiring', async () => {
      mockClient.from.mockImplementation(() => thenableProxy([]));

      await service.checkCertificationExpiry();

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should skip when expiry query returns error', async () => {
      mockClient.from.mockImplementation(() => thenableProxy(null, { message: 'DB error' }));

      await service.checkCertificationExpiry();

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('should skip notification when user disabled certification_expiry_reminders', async () => {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const expiringCert = {
        id: 'cert-003',
        organization_id: organizationId,
        certification_type: 'ISO',
        certification_number: 'ISO-003',
        status: 'active',
        expiry_date: sevenDaysLater.toISOString(),
      };

      const prefsBuilder = createMockQueryBuilder();
      prefsBuilder.eq.mockReturnValue(prefsBuilder);
      prefsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { certification_expiry_reminders: false },
        error: null,
      });

      const tableMocks: Record<string, any> = {
        certifications: thenableProxy([expiringCert]),
        roles: thenableProxy([{ id: 'role-001' }]),
        organization_users: thenableProxy([mockAdminUser]),
        user_notification_preferences: prefsBuilder,
      };

      mockClient.from.mockImplementation((table: string) => tableMocks[table] || createMockQueryBuilder());

      await service.checkCertificationExpiry();

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });
  });
});
