import { Module } from '@nestjs/common';
import { QualityControlService } from './quality-control.service';
import { QualityControlController } from './quality-control.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [QualityControlController],
  providers: [QualityControlService],
  exports: [QualityControlService],
})
export class QualityControlModule {}
