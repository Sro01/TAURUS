import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JwtPayload, JwtUser } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
        return secret;
      })(),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    return { id: payload.sub, name: payload.username, role: payload.role };
  }
}

