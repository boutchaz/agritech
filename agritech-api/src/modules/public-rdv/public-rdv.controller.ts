import { Body, Controller, HttpCode, HttpStatus, InternalServerErrorException, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute per IP
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
}
