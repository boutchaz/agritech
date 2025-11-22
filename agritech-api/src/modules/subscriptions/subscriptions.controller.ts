import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateTrialSubscriptionDto,
  SubscriptionResponseDto,
} from './dto/create-trial-subscription.dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Post('trial')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a trial subscription for an organization' })
  @ApiResponse({
    status: 201,
    description: 'Trial subscription created successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
  async createTrialSubscription(
    @Request() req,
    @Body() createTrialSubscriptionDto: CreateTrialSubscriptionDto,
  ) {
    return this.subscriptionsService.createTrialSubscription(
      req.user.id,
      createTrialSubscriptionDto,
    );
  }
}
