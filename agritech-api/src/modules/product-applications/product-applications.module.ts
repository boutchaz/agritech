import { Module } from '@nestjs/common';
import { ProductApplicationsController } from './product-applications.controller';
import { ProductApplicationsService } from './product-applications.service';
import { CaslModule } from '../casl/casl.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CaslModule, NotificationsModule],
  controllers: [ProductApplicationsController],
  providers: [ProductApplicationsService],
  exports: [ProductApplicationsService],
})
export class ProductApplicationsModule {}
