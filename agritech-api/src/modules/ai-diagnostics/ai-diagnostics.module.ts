import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AiDiagnosticsController } from './ai-diagnostics.controller';
import { AiDiagnosticsService } from './ai-diagnostics.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AiDiagnosticsController],
  providers: [AiDiagnosticsService],
  exports: [AiDiagnosticsService],
})
export class AiDiagnosticsModule {}
