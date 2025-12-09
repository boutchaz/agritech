import { Controller, Get, Post, Body, UseGuards, Request, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { SignupDto, SignupResponseDto } from './dto/signup.dto';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'User signup with organization creation' })
  @ApiResponse({
    status: 201,
    description: 'User signed up successfully',
    type: SignupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Conflict - User already exists' })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return this.authService.getUserProfile(req.user.id);
  }

  @Get('organizations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user organizations' })
  @ApiResponse({ status: 200, description: 'User organizations retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOrganizations(@Request() req) {
    return this.authService.getUserOrganizations(req.user.id);
  }

  @Get('me/role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
  @ApiOperation({ summary: 'Get current user role and permissions in organization' })
  @ApiResponse({ status: 200, description: 'User role and permissions retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserRole(
    @Request() req,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.authService.getUserRoleAndPermissions(req.user.id, organizationId);
  }
}
