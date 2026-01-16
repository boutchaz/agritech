import { Module, Global } from '@nestjs/common';
import { AdoptionController } from './adoption.controller';
import { AdoptionService } from './adoption.service';
import { DatabaseModule } from '../database/database.module';
import { EventsModule } from '../events/events.module';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';

@Global()
@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [AdoptionController],
  providers: [AdoptionService, InternalAdminGuard],
  exports: [AdoptionService],
})
export class AdoptionModule {}
