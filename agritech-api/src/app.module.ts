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
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { FarmsModule } from './modules/farms/farms.module';
import { ParcelsModule } from './modules/parcels/parcels.module';
import { CaslModule } from './modules/casl/casl.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

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
    SubscriptionsModule,
    FarmsModule,
    ParcelsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
