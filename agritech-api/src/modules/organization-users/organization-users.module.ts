import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { OrganizationUsersController } from './organization-users.controller';
import { OrganizationUsersService } from './organization-users.service';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [OrganizationUsersController],
  providers: [OrganizationUsersService],
  exports: [OrganizationUsersService],
})
export class OrganizationUsersModule {}
