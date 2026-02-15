import { Module } from '@nestjs/common';
import { CropTemplatesService } from './crop-templates.service';
import { CropTemplatesController } from './crop-templates.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CropTemplatesController],
  providers: [CropTemplatesService],
  exports: [CropTemplatesService],
})
export class CropTemplatesModule {}
