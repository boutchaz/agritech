import { Module } from '@nestjs/common';
import { HrAdvancedController } from './hr-advanced.controller';
import { HrAdvancedService } from './hr-advanced.service';

@Module({
  controllers: [HrAdvancedController],
  providers: [HrAdvancedService],
  exports: [HrAdvancedService],
})
export class HrAdvancedModule {}
