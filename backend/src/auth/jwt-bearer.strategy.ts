import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtBearerStrategy extends PassportStrategy(
  Strategy,
  'jwt-bearer',
) {
  // 👈 Named 'jwt-bearer'
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Standard Bearer check
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
    });
    // console.log(
    //   'JwtBearerStrategy initialized. Using secret from env:',
    //   !!process.env.JWT_SECRET,
    // );
  }

  async validate(payload: any) {
    console.log('JwtBearerStrategy validating payload:', payload);
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
