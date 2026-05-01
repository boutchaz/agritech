import { Module } from '@nestjs/common';
import { OrganizationModulesController } from './organization-modules.controller';
import { OrganizationModulesService } from './organization-modules.service';
import { DatabaseModule } from '../database/database.module';
import { CaslModule } from '../casl/casl.module';
import { ModuleConfigModule } from '../module-config/module-config.module';

@Module({
  imports: [DatabaseModule, CaslModule, ModuleConfigModule],
  controllers: [OrganizationModulesController],
  providers: [OrganizationModulesService],
  exports: [OrganizationModulesService],
})
export class OrganizationModulesModule {}
