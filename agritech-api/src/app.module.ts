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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
