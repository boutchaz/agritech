import { Module } from '@nestjs/common';
import { WorkerDocumentsController } from './worker-documents.controller';
import { WorkerDocumentsService } from './worker-documents.service';

@Module({
  controllers: [WorkerDocumentsController],
  providers: [WorkerDocumentsService],
  exports: [WorkerDocumentsService],
})
export class WorkerDocumentsModule {}
