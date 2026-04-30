import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [HttpModule.register({ timeout: 30_000, maxRedirects: 0 })],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
