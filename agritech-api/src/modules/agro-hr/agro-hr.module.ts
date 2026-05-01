import { Module } from '@nestjs/common';
import { AgroHrController } from './agro-hr.controller';
import { AgroHrService } from './agro-hr.service';

@Module({
  controllers: [AgroHrController],
  providers: [AgroHrService],
  exports: [AgroHrService],
})
export class AgroHrModule {}
