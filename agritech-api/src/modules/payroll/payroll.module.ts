import { Module } from '@nestjs/common';
import { HrComplianceModule } from '../hr-compliance/hr-compliance.module';
import { SalaryStructuresController } from './salary-structures.controller';
import { SalaryStructuresService } from './salary-structures.service';
import { SalarySlipsController } from './salary-slips.controller';
import { SalarySlipsService } from './salary-slips.service';
import { PayrollRunsController } from './payroll-runs.controller';
import { PayrollRunsService } from './payroll-runs.service';
import { PayrollCalcService } from './payroll-calc.service';
import { IrBracketsService } from './ir-brackets.service';

@Module({
  imports: [HrComplianceModule],
  controllers: [
    SalaryStructuresController,
    SalarySlipsController,
    PayrollRunsController,
  ],
  providers: [
    SalaryStructuresService,
    SalarySlipsService,
    PayrollRunsService,
    PayrollCalcService,
    IrBracketsService,
  ],
  exports: [PayrollCalcService, SalarySlipsService, PayrollRunsService],
})
export class PayrollModule {}
