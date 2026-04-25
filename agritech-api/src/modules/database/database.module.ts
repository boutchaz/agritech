import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [DatabaseService, ModuleEntitlementGuard],
  exports: [DatabaseService, ModuleEntitlementGuard],
})
export class DatabaseModule {}
