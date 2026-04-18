import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AiReferencesController } from './ai-references.controller';
import { AiReferencesService } from './ai-references.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AiReferencesController],
  providers: [AiReferencesService],
  exports: [AiReferencesService],
})
export class AiReferencesModule {}
