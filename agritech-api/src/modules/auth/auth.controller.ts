import { Controller, Get, Post, Patch, Body, UseGuards, Request, Headers, Res, Req } from '@nestjs/common';
import type { Response, Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { Public } from './decorators/public.decorator';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from './utils/auth-cookies';
import { SignupDto, SignupResponseDto, SetupOrganizationDto, SetupOrganizationResponseDto } from './dto/signup.dto';
import { IsEmail, IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ example: 'oldPassword123!', description: 'Current password (required if password was previously set)' })
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @ApiProperty({ example: 'newStrongPassword123!' })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'https://agritech-dashboard.thebzlab.online/auth/callback', description: 'URL to redirect after password reset' })
  @IsString()
  @IsNotEmpty()
  redirectTo: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'newStrongPassword123!' })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class OAuthUrlDto {
  @ApiProperty({ example: 'google' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: 'http://localhost:5173/auth/callback' })
  @IsString()
  @IsNotEmpty()
  redirectTo: string;
}

export class OAuthCallbackDto {
  @ApiProperty({ example: 'abcd1234oauthcode' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiPropertyOptional({ example: '+212612345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar_url?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class RedeemExchangeCodeDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('ping')
  @Public()
  @ApiOperation({ summary: 'Connectivity heartbeat for offline-first clients' })
  ping() {
    return { ok: true, ts: Date.now() };
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
      loginDto.rememberMe !== false,
    );
    if (result?.access_token) {
      setAuthCookies(res, {
        accessToken: result.access_token,
        refreshToken: result.refresh_token || '',
        expiresIn: result.expires_in,
      });
    }
    return result;
  }

  @Post('oauth/url')
  @Public()
  @ApiOperation({ summary: 'Generate OAuth URL for provider login' })
  @ApiResponse({ status: 200, description: 'OAuth URL generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getOAuthUrl(@Body() dto: OAuthUrlDto) {
    return this.authService.getOAuthUrl(dto.provider, dto.redirectTo);
  }

  @Post('oauth/callback')
  @Public()
  @ApiOperation({ summary: 'Exchange OAuth code for session tokens' })
  @ApiResponse({ status: 200, description: 'OAuth code exchanged successfully' })
  @ApiResponse({ status: 401, description: 'Invalid OAuth code' })
  async exchangeOAuthCode(
    @Body() dto: OAuthCallbackDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.exchangeOAuthCode(dto.code);
    // Persist the OAuth-issued session as httpOnly cookies so the browser has
    // a durable session even after the in-memory tokens are cleared on reload.
    if (result?.access_token) {
      setAuthCookies(res, {
        accessToken: result.access_token,
        refreshToken: result.refresh_token || '',
        expiresIn: result.expires_in,
      });
    }
    return result;
  }

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
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(signupDto);
    // Persist signup-issued session as httpOnly cookies (parity with /login).
    const tokens = (result as any)?.session ?? result;
    if (tokens?.access_token) {
      setAuthCookies(res, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        expiresIn: tokens.expires_in,
      });
    }
    return result;
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

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
    return this.authService.updateUserProfile(req.user.id, body);
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
  @UseGuards(JwtAuthGuard, OrganizationGuard)
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

  @Get('me/abilities')
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
  @ApiOperation({
    summary: 'Get CASL abilities for current user',
    description: 'Returns CASL-compatible abilities that can be used directly by frontend/mobile for permission checks. This is the single source of truth for permissions.'
  })
  @ApiResponse({
    status: 200,
    description: 'User abilities retrieved',
    schema: {
      type: 'object',
      properties: {
        role: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'farm_worker' },
            display_name: { type: 'string', example: 'Farm Worker' },
            level: { type: 'number', example: 40 },
          },
        },
        abilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', example: 'read' },
              subject: { type: 'string', example: 'Farm' },
              inverted: { type: 'boolean', example: false },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserAbilities(
    @Request() req,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.authService.getUserAbilities(req.user.id, organizationId);
  }

  @Post('setup-organization')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup organization for existing user without one' })
  @ApiResponse({
    status: 201,
    description: 'Organization created and user added as admin',
    type: SetupOrganizationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setupOrganization(
    @Request() req,
    @Body() setupDto: SetupOrganizationDto,
  ) {
    return this.authService.setupOrganization(
      req.user.id,
      req.user.email,
      setupDto.organizationName,
    );
  }

   @Post('change-password')
   @UseGuards(JwtAuthGuard)
   @ApiBearerAuth()
   @ApiOperation({ summary: 'Change current user password' })
   @ApiResponse({ status: 200, description: 'Password updated successfully' })
   @ApiResponse({ status: 400, description: 'Bad request' })
   @ApiResponse({ status: 401, description: 'Unauthorized' })
   async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
     return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
   }

   @Post('logout')
   @UseGuards(JwtAuthGuard)
   @ApiBearerAuth()
   @ApiOperation({ summary: 'Logout and revoke session globally' })
   @ApiResponse({ status: 200, description: 'Logged out successfully' })
   @ApiResponse({ status: 401, description: 'Unauthorized' })
   async logout(
     @Request() req,
     @Res({ passthrough: true }) res: Response,
   ) {
     const authHeader = req.headers.authorization;
     const jwt = authHeader?.substring(7) || req.cookies?.[ACCESS_TOKEN_COOKIE];
     await this.authService.logout(jwt);
     clearAuthCookies(res);
     return { message: 'Logged out successfully' };
   }

  @Post('forgot-password')
  @Public()
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email, dto.redirectTo);
  }

  @Post('reset-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset password using recovery token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token / not a recovery session' })
  async resetPassword(@Request() req, @Body() dto: ResetPasswordDto) {
    // Require the JWT to come from the Supabase recovery flow specifically —
    // a normal session token (or any old leaked JWT that's still within its
    // exp window) must not be accepted to change the password. We check two
    // independent signals: (1) `amr` claim contains `recovery`, and (2) the
    // token was issued recently (recovery JWTs are short-lived in practice).
    return this.authService.resetPasswordWithRecoveryProof(
      req.rawToken,
      req.user.id,
      dto.newPassword,
    );
  }

  @Post('refresh-token')
  @Public()
  @ApiOperation({ summary: 'Refresh access token using refresh token (body or cookie)' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() body: RefreshTokenDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = body?.refreshToken || req.cookies?.[REFRESH_TOKEN_COOKIE];
    const result = await this.authService.refreshToken(refreshToken);
    if (result?.access_token) {
      setAuthCookies(res, {
        accessToken: result.access_token,
        refreshToken: result.refresh_token || refreshToken || '',
        expiresIn: result.expires_in,
      });
    }
    return result;
  }

  @Post('exchange-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate one-time exchange code for cross-app auth' })
  @ApiResponse({ status: 201, description: 'Exchange code generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateExchangeCode(@Request() req) {
    return this.authService.generateExchangeCode(req.user.id);
  }

  @Post('exchange-code/redeem')
  @Public()
  @ApiOperation({ summary: 'Redeem exchange code for session tokens' })
  @ApiResponse({ status: 200, description: 'Session tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  async redeemExchangeCode(@Body() body: RedeemExchangeCodeDto) {
    return this.authService.redeemExchangeCode(body.code);
  }
}
