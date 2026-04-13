import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { WeatherAlertsCronService } from './weather-alerts-cron.service';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [WeatherController],
  providers: [WeatherService, WeatherAlertsCronService],
  exports: [WeatherService],
})
export class WeatherModule {}
