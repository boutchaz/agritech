import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AgronomyRagController } from './agronomy-rag.controller';
import { AgronomyRagService } from './agronomy-rag.service';
import { SourcesService } from './sources.service';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [AgronomyRagController],
  providers: [AgronomyRagService, SourcesService],
  exports: [AgronomyRagService],
})
export class AgronomyRagModule {}
