import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHealth(): { message: string; status: string; timestamp: string } {
    return {
      message: 'AgriTech API is running',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getDetailedHealth(): {
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get('NODE_ENV', 'development'),
    };
  }
}
