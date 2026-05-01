import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BannersUserController, BannersAdminController } from './banners.controller';
import { BannersService } from './banners.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BannersUserController, BannersAdminController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}
