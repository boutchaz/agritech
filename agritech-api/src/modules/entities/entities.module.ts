import { Module } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
