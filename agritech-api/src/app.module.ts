import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { Reflector, APP_INTERCEPTOR } from "@nestjs/core";
import { OfflineInterceptor } from "./common/interceptors/offline.interceptor";
import { SyncModule } from "./modules/sync/sync.module";
import { SentryModule } from "@sentry/nestjs/setup";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

// Modules
import { DatabaseModule } from "./modules/database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SequencesModule } from "./modules/sequences/sequences.module";
import { AccountsModule } from "./modules/accounts/accounts.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { JournalEntriesModule } from "./modules/journal-entries/journal-entries.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { FinancialReportsModule } from "./modules/financial-reports/financial-reports.module";
import { ProductionIntelligenceModule } from "./modules/production-intelligence/production-intelligence.module";
import { HarvestsModule } from "./modules/harvests/harvests.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { WorkersModule } from "./modules/workers/workers.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { HrComplianceModule } from "./modules/hr-compliance/hr-compliance.module";
import { LeaveManagementModule } from "./modules/leave-management/leave-management.module";
import { PayrollModule } from "./modules/payroll/payroll.module";
import { WorkerDocumentsModule } from "./modules/worker-documents/worker-documents.module";
import { ShiftsModule } from "./modules/shifts/shifts.module";
import { EmployeeLifecycleModule } from "./modules/employee-lifecycle/employee-lifecycle.module";
import { AgroHrModule } from "./modules/agro-hr/agro-hr.module";
import { StockEntriesModule } from "./modules/stock-entries/stock-entries.module";
import { ItemsModule } from "./modules/items/items.module";
import { WarehousesModule } from "./modules/warehouses/warehouses.module";
import { ReferenceDataModule } from "./modules/reference-data/reference-data.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { FarmsModule } from "./modules/farms/farms.module";
import { ParcelsModule } from "./modules/parcels/parcels.module";
import { CaslModule } from "./modules/casl/casl.module";
import { UsersModule } from "./modules/users/users.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { OrganizationModulesModule } from "./modules/organization-modules/organization-modules.module";
import { StructuresModule } from "./modules/structures/structures.module";
import { EquipmentModule } from "./modules/equipment/equipment.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { ReceptionBatchesModule } from "./modules/reception-batches/reception-batches.module";
import { BlogsModule } from "./modules/blogs/blogs.module";
import { SalesOrdersModule } from "./modules/sales-orders/sales-orders.module";
import { PurchaseOrdersModule } from "./modules/purchase-orders/purchase-orders.module";
import { TaxesModule } from "./modules/taxes/taxes.module";
import { QuotesModule } from "./modules/quotes/quotes.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { OrganizationUsersModule } from "./modules/organization-users/organization-users.module";
import { SatelliteIndicesModule } from "./modules/satellite-indices/satellite-indices.module";
import { WeatherModule } from "./modules/weather/weather.module";
import { WorkUnitsModule } from "./modules/work-units/work-units.module";
import { BannersModule } from "./modules/banners/banners.module";
import { ChangelogsModule } from "./modules/changelogs/changelogs.module";
import { SoilAnalysesModule } from "./modules/soil-analyses/soil-analyses.module";
import { AnalysesModule } from "./modules/analyses/analyses.module";
import { RolesModule } from "./modules/roles/roles.module";
import { DeliveriesModule } from "./modules/deliveries/deliveries.module";
import { PaymentRecordsModule } from "./modules/payment-records/payment-records.module";
import { CostCentersModule } from "./modules/cost-centers/cost-centers.module";
import { BankAccountsModule } from "./modules/bank-accounts/bank-accounts.module";
import { BankReconciliationModule } from "./modules/bank-reconciliation/bank-reconciliation.module";
import { UtilitiesModule } from "./modules/utilities/utilities.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { PieceWorkModule } from "./modules/piece-work/piece-work.module";
import { TaskAssignmentsModule } from "./modules/task-assignments/task-assignments.module";
import { ProfitabilityModule } from "./modules/profitability/profitability.module";
import { ProductApplicationsModule } from "./modules/product-applications/product-applications.module";
import { AccountMappingsModule } from "./modules/account-mappings/account-mappings.module";
import { AdminModule } from "./modules/admin/admin.module";
import { EventsModule } from "./modules/events/events.module";
import { MarketplaceModule } from "./modules/marketplace/marketplace.module";
import { StrapiModule } from "./modules/strapi/strapi.module";
import { DemoDataModule } from "./modules/demo-data/demo-data.module";
import { FilesModule } from "./modules/files/files.module";
import { DocumentTemplatesModule } from "./modules/document-templates/document-templates.module";
import { LabServicesModule } from "./modules/lab-services/lab-services.module";
import { TreeManagementModule } from "./modules/tree-management/tree-management.module";
import { AiReferencesModule } from "./modules/ai-references/ai-references.module";
import { AIReportsModule } from "./modules/ai-reports/ai-reports.module";
import { OrganizationAISettingsModule } from "./modules/organization-ai-settings/organization-ai-settings.module";
import { ChatModule } from "./modules/chat/chat.module";
import { FiscalYearsModule } from "./modules/fiscal-years/fiscal-years.module";
import { BiologicalAssetsModule } from "./modules/biological-assets/biological-assets.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { CropCyclesModule } from "./modules/crop-cycles/crop-cycles.module";
import { CropCycleStagesModule } from "./modules/crop-cycle-stages/crop-cycle-stages.module";
import { HarvestEventsModule } from "./modules/harvest-events/harvest-events.module";
import { CropTemplatesModule } from "./modules/crop-templates/crop-templates.module";
import { QualityControlModule } from "./modules/quality-control/quality-control.module";
import { AdoptionModule } from "./modules/adoption/adoption.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { EmailModule } from "./modules/email/email.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PestAlertsModule } from "./modules/pest-alerts/pest-alerts.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";
import { RemindersModule } from "./modules/reminders/reminders.module";
import { ModuleConfigModule } from "./modules/module-config/module-config.module";
import { OrgSetupModule } from "./modules/org-setup/org-setup.module";
import { TaskTemplatesModule } from "./modules/task-templates/task-templates.module";
import { PolarModule } from "./modules/polar/polar.module";
import { EntitiesModule } from "./modules/entities/entities.module";
import { CalibrationModule } from "./modules/calibration/calibration.module";
import { SeasonTrackingModule } from "./modules/season-tracking/season-tracking.module";
import { AiDiagnosticsModule } from "./modules/ai-diagnostics/ai-diagnostics.module";
import { AiAlertsModule } from "./modules/ai-alerts/ai-alerts.module";
import { AiRecommendationsModule } from "./modules/ai-recommendations/ai-recommendations.module";
import { AnnualPlanModule } from "./modules/annual-plan/annual-plan.module";
import { AiJobsModule } from "./modules/ai-jobs/ai-jobs.module";
import { ParcelEventsModule } from "./modules/parcel-events/parcel-events.module";
import { HealthModule } from "./modules/health/health.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AiQuotaModule } from "./modules/ai-quota/ai-quota.module";
import { PublicRdvModule } from "./modules/public-rdv/public-rdv.module";
import { EmailTemplatesModule } from "./modules/email-templates/email-templates.module";
import { BarcodeModule } from "./modules/barcode/barcode.module";

@Module({
  imports: [
    // Sentry must be first
    SentryModule.forRoot(),

    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Rate limiting - 300 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute in milliseconds
        limit: 300,
      },
    ]),

    // Core modules
    DatabaseModule,
    AiQuotaModule,
    AuditModule,
    AuthModule,
    CaslModule,
    UsersModule,
    OrganizationsModule,
    OrganizationModulesModule,
    OrganizationUsersModule,
    RolesModule,
    OnboardingModule,

    // Business logic modules
    SequencesModule,
    AccountsModule,
    TaxesModule,
    CustomersModule,
    SuppliersModule,
    QuotesModule,
    SalesOrdersModule,
    PurchaseOrdersModule,
    InvoicesModule,
    JournalEntriesModule,
    PaymentsModule,
    FinancialReportsModule,
    ProductionIntelligenceModule,
    HarvestsModule,
    DeliveriesModule,
    TasksModule,
    TaskAssignmentsModule,
    WorkersModule,
    AttendanceModule,
    HrComplianceModule,
    LeaveManagementModule,
    PayrollModule,
    WorkerDocumentsModule,
    ShiftsModule,
    EmployeeLifecycleModule,
    AgroHrModule,
    WorkUnitsModule,
    BannersModule,
    ChangelogsModule,
    PieceWorkModule,
    PaymentRecordsModule,
    StockEntriesModule,
    ItemsModule,
    BarcodeModule,
    WarehousesModule,
    ReferenceDataModule,
    SubscriptionsModule,
    FarmsModule,
    ParcelsModule,
    SatelliteIndicesModule,
    WeatherModule,
    SoilAnalysesModule,
    AnalysesModule,
    StructuresModule,
    EquipmentModule,
    DashboardModule,
    ReceptionBatchesModule,
    BlogsModule,
    CostCentersModule,
    BankAccountsModule,
    BankReconciliationModule,
    UtilitiesModule,
    ReportsModule,
    ProfitabilityModule,
    ProductApplicationsModule,
    AccountMappingsModule,
    FiscalYearsModule,
    BiologicalAssetsModule,
    CampaignsModule,
    CropCyclesModule,
    CropCycleStagesModule,
    HarvestEventsModule,
    CropTemplatesModule,
    QualityControlModule,

    DocumentTemplatesModule,
    LabServicesModule,
    TreeManagementModule,

    // Admin & Analytics
    AdminModule,
    EventsModule,
    AdoptionModule,
    MarketplaceModule,
    StrapiModule,
    DemoDataModule,
    FilesModule,
    AiReferencesModule,
    AIReportsModule,
    OrganizationAISettingsModule,
    ChatModule,
    EmailModule,
    NotificationsModule,
    PestAlertsModule,
    ComplianceModule,
    RemindersModule,
    ModuleConfigModule,
    OrgSetupModule,
    TaskTemplatesModule,
    PolarModule,
    EntitiesModule,
    CalibrationModule,
    SeasonTrackingModule,
    AiDiagnosticsModule,
    AiAlertsModule,
    AiRecommendationsModule,
    AnnualPlanModule,
    AiJobsModule,
    ParcelEventsModule,
    HealthModule,
    MonitoringModule,
    PublicRdvModule,
    EmailTemplatesModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Reflector,
    { provide: APP_INTERCEPTOR, useClass: OfflineInterceptor },
  ],
})
export class AppModule {}
