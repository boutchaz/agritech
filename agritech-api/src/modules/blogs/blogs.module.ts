import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlogsController } from './blogs.controller';
import { BlogSsrController } from './blog-ssr.controller';
import { BlogFeedsController } from './blog-feeds.controller';
import { NewsletterController } from './newsletter.controller';
import { BlogsService } from './blogs.service';
import { BlogSsrService } from './blog-ssr.service';
import { NewsletterService } from './newsletter.service';
import { DatabaseModule } from '../database/database.module';
import { ReferenceDataModule } from '../reference-data/reference-data.module';

@Module({
  imports: [ReferenceDataModule, ConfigModule, DatabaseModule],
  controllers: [BlogsController, BlogSsrController, BlogFeedsController, NewsletterController],
  providers: [BlogsService, BlogSsrService, NewsletterService],
  exports: [BlogsService],
})
export class BlogsModule {}
