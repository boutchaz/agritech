import { Body, Controller, HttpCode, HttpStatus, InternalServerErrorException, Ip, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CreateSiamRdvDto } from './dto/create-siam-rdv.dto';
import { PublicRdvService } from './public-rdv.service';

@ApiTags('public-rdv')
@Controller('public/rdv')
export class PublicRdvController {
  constructor(private readonly publicRdvService: PublicRdvService) {}

  @Post('siam')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit SIAM meeting request (public)' })
  @ApiResponse({ status: 200, description: 'Request received' })
  @ApiResponse({ status: 500, description: 'Failed to process request' })
  async createSiamRdv(
    @Body() dto: CreateSiamRdvDto,
    @Ip() ip: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.publicRdvService.createSiamRdv(dto, ip);
    if (!result.success) {
      throw new InternalServerErrorException('Unable to process rendez-vous request');
    }
    return {
      success: true,
      message: 'Rendez-vous request submitted successfully',
    };
  }

  @Post('siam/:id/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a SIAM RDV lead and send confirmation email' })
  @ApiResponse({ status: 200, description: 'Lead confirmed' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async confirmLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { override_slot?: string },
  ): Promise<{ success: boolean; emailSent: boolean }> {
    return this.publicRdvService.confirmLead(id, body.override_slot);
  }

  @Post('siam/:id/reject')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a SIAM RDV lead and send rejection email' })
  @ApiResponse({ status: 200, description: 'Lead rejected' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async rejectLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
  ): Promise<{ success: boolean; emailSent: boolean }> {
    return this.publicRdvService.rejectLead(id, body.reason);
  }
}
