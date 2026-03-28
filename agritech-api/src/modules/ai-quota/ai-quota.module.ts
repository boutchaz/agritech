import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AiQuotaService } from './ai-quota.service';
import { AiQuotaController } from './ai-quota.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AiQuotaController],
  providers: [AiQuotaService],
  exports: [AiQuotaService],
})
export class AiQuotaModule {}
