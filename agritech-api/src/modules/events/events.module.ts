import { Module, Global } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { DatabaseModule } from '../database/database.module';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [EventsController],
  providers: [EventsService, InternalAdminGuard],
  exports: [EventsService],
})
export class EventsModule {}
