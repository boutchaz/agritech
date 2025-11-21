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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      // Also accept Supabase JWTs
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    // Extract the token from the request
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    try {
      // Try to validate as Supabase token first
      const user = await this.authService.validateToken(token);
      return user;
    } catch (error) {
      // If not a valid Supabase token, check if it's our own JWT
      if (payload && payload.sub) {
        return { id: payload.sub, email: payload.email };
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
