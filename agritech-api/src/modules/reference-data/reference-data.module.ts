import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';
import { StrapiService } from './strapi.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataService, StrapiService],
  exports: [ReferenceDataService, StrapiService],
})
export class ReferenceDataModule {}
