import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ChangelogsController } from './changelogs.controller';
import { ChangelogsService } from './changelogs.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ChangelogsController],
  providers: [ChangelogsService],
  exports: [ChangelogsService],
})
export class ChangelogsModule {}
