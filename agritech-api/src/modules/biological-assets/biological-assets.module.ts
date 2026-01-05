import { Module } from '@nestjs/common';
import { BiologicalAssetsService } from './biological-assets.service';
import { BiologicalAssetsController } from './biological-assets.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BiologicalAssetsController],
  providers: [BiologicalAssetsService],
  exports: [BiologicalAssetsService],
})
export class BiologicalAssetsModule {}
