import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';
import { StrapiService } from './strapi.service';

@Module({
  imports: [ConfigModule],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataService, StrapiService],
  exports: [ReferenceDataService, StrapiService],
})
export class ReferenceDataModule {}
