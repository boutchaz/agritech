import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AdminModule } from '../admin/admin.module';
import { AgronomyRagController } from './agronomy-rag.controller';
import { AgronomyRagAdminController } from './agronomy-rag-admin.controller';
import { AgronomyRagService } from './agronomy-rag.service';
import { SourcesService } from './sources.service';

@Module({
  imports: [DatabaseModule, ConfigModule, AdminModule],
  controllers: [AgronomyRagController, AgronomyRagAdminController],
  providers: [AgronomyRagService, SourcesService],
  exports: [AgronomyRagService],
})
export class AgronomyRagModule {}
