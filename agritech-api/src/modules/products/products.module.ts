import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
