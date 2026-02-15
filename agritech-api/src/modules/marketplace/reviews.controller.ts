import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('marketplace/reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('can-review/:sellerId')
  async canReview(
    @Request() req: any,
    @Param('sellerId') sellerId: string,
  ) {
    const token = req.headers.authorization?.substring(7);
    return this.reviewsService.canReview(token, sellerId);
  }

  @Post()
  async createReview(
    @Request() req: any,
    @Body() dto: CreateReviewDto,
  ) {
    const token = req.headers.authorization?.substring(7);
    try {
      return await this.reviewsService.createReview(token, dto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create review',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
