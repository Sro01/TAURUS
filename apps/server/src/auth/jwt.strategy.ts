import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, JwtUser } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
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
    // 관리자 토큰인 경우 DB 조회 없이 통과 (Admin은 Team 테이블에 없음)
    if (payload.role === 'ADMIN') {
      return { id: payload.sub, name: payload.username, role: payload.role };
    }

    const team = await this.prisma.team.findUnique({
      where: { id: payload.sub },
    });

    if (!team) {
      throw new UnauthorizedException('존재하지 않는 팀입니다.');
    }

    // 토큰 버전 검증 (비밀번호 변경 시 이전 토큰 무효화)
    if (payload.v !== undefined && payload.v !== team.tokenVersion) {
      throw new UnauthorizedException('비밀번호가 변경되어 로그아웃되었습니다. 다시 로그인해주세요.');
    }

    return { id: team.id, name: team.name, role: team.role };
  }
}

