import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtCookieStrategy extends PassportStrategy(
  Strategy,
  'jwt-cookie',
) {
  constructor() {
    super({
      // Extract JWT from cookie instead of Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey', // Make sure to use env vars in prod
    });
  }

  async validate(payload: any) {
    console.log('JwtCookieStrategy validating payload:', payload);
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
