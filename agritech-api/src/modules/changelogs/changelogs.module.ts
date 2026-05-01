import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ChangelogsPublicController, ChangelogsAdminController } from './changelogs.controller';
import { ChangelogsService } from './changelogs.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ChangelogsPublicController, ChangelogsAdminController],
  providers: [ChangelogsService],
  exports: [ChangelogsService],
})
export class ChangelogsModule {}
