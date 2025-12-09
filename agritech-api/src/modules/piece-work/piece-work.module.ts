import { Module } from '@nestjs/common';
import { PieceWorkController } from './piece-work.controller';
import { PieceWorkService } from './piece-work.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PieceWorkController],
  providers: [PieceWorkService],
  exports: [PieceWorkService],
})
export class PieceWorkModule {}
