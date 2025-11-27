import { Module } from '@nestjs/common';
import { StructuresController } from './structures.controller';
import { StructuresService } from './structures.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [StructuresController],
  providers: [StructuresService],
  exports: [StructuresService],
})
export class StructuresModule {}
