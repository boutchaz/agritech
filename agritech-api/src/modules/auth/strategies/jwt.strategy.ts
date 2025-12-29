import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    // Use Supabase JWT secret for validation
    // This should be the same as SUPABASE_JWT_SECRET or the JWT secret from Supabase dashboard
    const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET') ||
                      configService.get<string>('JWT_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    // Extract the token from the request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    console.log('[JwtStrategy] validate called with payload:', {
      sub: payload?.sub,
      email: payload?.email,
      exp: payload?.exp,
      iat: payload?.iat,
    });

    try {
      // Validate the token with Supabase to get full user info
      const user = await this.authService.validateToken(token);
      console.log('[JwtStrategy] Token validated successfully, user:', {
        id: user?.id,
        email: user?.email,
      });
      return user;
    } catch (error) {
      console.warn('[JwtStrategy] Supabase validation failed:', error.message);
      // If Supabase validation fails but payload exists, use payload
      if (payload && payload.sub) {
        console.log('[JwtStrategy] Falling back to JWT payload');
        return { id: payload.sub, email: payload.email };
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
