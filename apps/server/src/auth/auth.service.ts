import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TeamService } from '../team/team.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyDto } from './dto/verify.dto';
import * as bcrypt from 'bcrypt';
import { TEAM_TOKEN_EXPIRY } from '../common/constants';

@Injectable()
export class AuthService {
    constructor(
        private teamService: TeamService,
        private jwtService: JwtService,
    ) { }

    // ──────────────────────────────────────
    // 팀 등록 (명시적 등록 — 팀 관리 페이지용)
    // ──────────────────────────────────────
    async register(dto: RegisterDto) {
        // 이름 검사·겹침 확인(409)·해시는 TeamService.create가 함
        const team = await this.teamService.create(dto.name, dto.password);

        return {
            id: team.id,
            name: team.name,
            message: '팀 등록이 완료되었습니다.',
        };
    }

    // ──────────────────────────────────────
    // 팀 인증 (verify) — 비교용 이름으로 팀을 찾음 (fightman → FIGHTMAN)
    // - 기존 팀: 비밀번호 확인 후 짧은 JWT(15분) 발급
    // - 미등록 팀 + autoRegister: 자동 등록 후 JWT 발급
    // - 미등록 팀 + !autoRegister: 에러 반환
    // ──────────────────────────────────────
    async verify(dto: VerifyDto) {
        const team = await this.teamService.findByName(dto.name);

        // 팀이 존재하지 않는 경우
        if (!team) {
            // autoRegister가 true면 자동 등록 (바로 예약 플로우)
            if (dto.autoRegister) {
                const newTeam = await this.teamService.create(dto.name, dto.password);

                const payload = { sub: newTeam.id, username: newTeam.name, role: newTeam.role, v: newTeam.tokenVersion };
                return {
                    access_token: this.jwtService.sign(payload, { expiresIn: TEAM_TOKEN_EXPIRY }),
                    isNewTeam: true,
                    message: '팀이 자동 등록되었습니다.',
                };
            }

            // autoRegister가 false면 등록 안내 (미리 예약 플로우)
            throw new UnauthorizedException('등록되지 않은 팀입니다. 먼저 팀 등록을 해주세요.');
        }

        // 팀이 존재하는 경우 — 비밀번호 검증
        if (!(await bcrypt.compare(dto.password, team.password))) {
            throw new UnauthorizedException('비밀번호가 올바르지 않습니다.');
        }

        // 짧은 세션 토큰 발급 (15분)
        const payload = { sub: team.id, username: team.name, role: team.role, v: team.tokenVersion };
        return {
            access_token: this.jwtService.sign(payload, { expiresIn: TEAM_TOKEN_EXPIRY }),
            isNewTeam: false,
        };
    }
}
