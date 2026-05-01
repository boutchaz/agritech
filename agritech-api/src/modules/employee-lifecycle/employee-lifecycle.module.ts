import { Module } from '@nestjs/common';
import { EmployeeLifecycleController } from './employee-lifecycle.controller';
import { EmployeeLifecycleService } from './employee-lifecycle.service';

@Module({
  controllers: [EmployeeLifecycleController],
  providers: [EmployeeLifecycleService],
  exports: [EmployeeLifecycleService],
})
export class EmployeeLifecycleModule {}
