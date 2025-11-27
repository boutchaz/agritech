import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Core modules
    DatabaseModule,
    AuthModule,
    CaslModule,
    UsersModule,
    OrganizationsModule,
    OrganizationModulesModule,

    // Business logic modules
    SequencesModule,
    AccountsModule,
    InvoicesModule,
    JournalEntriesModule,
    PaymentsModule,
    FinancialReportsModule,
    ProductionIntelligenceModule,
    HarvestsModule,
    TasksModule,
    WorkersModule,
    StockEntriesModule,
    ItemsModule,
    WarehousesModule,
    ReferenceDataModule,
    SubscriptionsModule,
    FarmsModule,
    ParcelsModule,
    StructuresModule,
    DashboardModule,
    ReceptionBatchesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
