import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LetterHeadsController } from './letter-heads.controller';
import { LetterHeadsService } from './letter-heads.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LetterHeadsController],
  providers: [LetterHeadsService],
  exports: [LetterHeadsService],
})
export class LetterHeadsModule {}
