import { Module } from '@nestjs/common';
import { PaymentRecordsController } from './payment-records.controller';
import { PaymentRecordsService } from './payment-records.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentRecordsController],
  providers: [PaymentRecordsService],
  exports: [PaymentRecordsService],
})
export class PaymentRecordsModule {}
