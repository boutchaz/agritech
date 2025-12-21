import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { DatabaseModule } from './modules/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { SequencesModule } from './modules/sequences/sequences.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { JournalEntriesModule } from './modules/journal-entries/journal-entries.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FinancialReportsModule } from './modules/financial-reports/financial-reports.module';
import { ProductionIntelligenceModule } from './modules/production-intelligence/production-intelligence.module';
import { HarvestsModule } from './modules/harvests/harvests.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { WorkersModule } from './modules/workers/workers.module';
import { StockEntriesModule } from './modules/stock-entries/stock-entries.module';
import { ItemsModule } from './modules/items/items.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { ReferenceDataModule } from './modules/reference-data/reference-data.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { FarmsModule } from './modules/farms/farms.module';
import { ParcelsModule } from './modules/parcels/parcels.module';
import { CaslModule } from './modules/casl/casl.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { OrganizationModulesModule } from './modules/organization-modules/organization-modules.module';
import { StructuresModule } from './modules/structures/structures.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReceptionBatchesModule } from './modules/reception-batches/reception-batches.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { OrganizationUsersModule } from './modules/organization-users/organization-users.module';
import { SatelliteIndicesModule } from './modules/satellite-indices/satellite-indices.module';
import { WorkUnitsModule } from './modules/work-units/work-units.module';
import { SoilAnalysesModule } from './modules/soil-analyses/soil-analyses.module';
import { AnalysesModule } from './modules/analyses/analyses.module';
import { RolesModule } from './modules/roles/roles.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { PaymentRecordsModule } from './modules/payment-records/payment-records.module';
import { CostCentersModule } from './modules/cost-centers/cost-centers.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { UtilitiesModule } from './modules/utilities/utilities.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PieceWorkModule } from './modules/piece-work/piece-work.module';
import { ProfitabilityModule } from './modules/profitability/profitability.module';
import { ProductApplicationsModule } from './modules/product-applications/product-applications.module';
import { AccountMappingsModule } from './modules/account-mappings/account-mappings.module';
import { AdminModule } from './modules/admin/admin.module';
import { EventsModule } from './modules/events/events.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { StrapiModule } from './modules/strapi/strapi.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting - 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute in milliseconds
        limit: 100,
      },
    ]),

    // Core modules
    DatabaseModule,
    AuthModule,
    CaslModule,
    UsersModule,
    OrganizationsModule,
    OrganizationModulesModule,
    OrganizationUsersModule,
    RolesModule,

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
    WorkersModule,
    WorkUnitsModule,
    PieceWorkModule,
    PaymentRecordsModule,
    StockEntriesModule,
    ItemsModule,
    WarehousesModule,
    ReferenceDataModule,
    SubscriptionsModule,
    FarmsModule,
    ParcelsModule,
    SatelliteIndicesModule,
    SoilAnalysesModule,
    AnalysesModule,
    StructuresModule,
    DashboardModule,
    ReceptionBatchesModule,
    BlogsModule,
    CostCentersModule,
    BankAccountsModule,
    UtilitiesModule,
    ReportsModule,
    ProfitabilityModule,
    ProductApplicationsModule,
    AccountMappingsModule,

    // Admin & Analytics
    AdminModule,
    EventsModule,
    MarketplaceModule,
    StrapiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
