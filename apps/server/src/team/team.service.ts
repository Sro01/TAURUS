import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { Prisma, Team } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { normalizeName } from '../common/utils/name';
import { assertValidTeamName, teamNameProblem } from './team-name.policy';
import { TeamSearchItem, TeamSearchResult } from './dto/search-team.dto';
import * as bcrypt from 'bcrypt';

import { JwtService } from '@nestjs/jwt';
import { TEAM_TOKEN_EXPIRY } from '../common/constants';

const TEAM_NAME_TAKEN = '이미 있는 팀 이름이에요.';
const TEAM_SEARCH_LIMIT = 5;

type TeamSearchRow = { id: string; name: string; nameKey: string };

@Injectable()
export class TeamService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    // 전체 팀 조회 (검색 가능)
    async findAll(search?: string): Promise<TeamResponseDto[]> {
        const teams = await this.prisma.team.findMany({
            where: search
                ? {
                    name: { contains: search, mode: 'insensitive' },
                }
                : undefined,
            orderBy: { name: 'asc' },
        });

        return teams.map((team) => new TeamResponseDto(team));
    }

    // 특정 팀 조회
    async findOne(id: string): Promise<TeamResponseDto> {
        const team = await this.prisma.team.findUnique({
            where: { id },
        });

        if (!team) {
            throw new NotFoundException('팀을 찾을 수 없습니다.');
        }

        return new TeamResponseDto(team);
    }

    // 비교용 이름으로 팀 찾기 (대소문자·띄어쓰기·특수문자 무시)
    // 비교용 이름이 빈 값이면(특수문자·이모지만) 찾지 않음 → autoRegister는 create의 금지 규칙으로 400
    async findByName(name: string): Promise<Team | null> {
        const nameKey = normalizeName(name);
        if (nameKey === '') return null;
        return this.prisma.team.findUnique({ where: { nameKey } });
    }

  // 입력한 팀 이름과 같거나 비슷한 팀 찾기 (예약 모달 팀 이름 칸)
  // matches: 비교용 이름이 입력 키를 포함하거나, 입력 키(2글자 이상)에 포함되는 팀
  // 정렬: 같은 팀 → 입력 키로 시작 → 나머지, 묶음 안에서는 이름 순. 최대 5개
  async search(q: string): Promise<TeamSearchResult> {
    const problem = q === '' ? null : teamNameProblem(q);
    const key = normalizeName(q);
    if (key === '') return { problem, exact: null, matches: [] };

    // key는 숫자·영문·한글만이라 LIKE 특수문자가 없음. 값은 파라미터로 넘어감
    const rows = await this.prisma.$queryRaw<TeamSearchRow[]>`
      SELECT "id", "name", "nameKey" FROM "teams"
      WHERE "nameKey" LIKE '%' || ${key} || '%'
         OR (length(${key}) >= 2 AND strpos(${key}, "nameKey") > 0)
    `;

    const rank = (nameKey: string) =>
      nameKey === key ? 0 : nameKey.startsWith(key) ? 1 : 2;
    const sorted = rows
      .map((row) => ({ row, rank: rank(row.nameKey) }))
      .sort(
        (a, b) => a.rank - b.rank || a.row.name.localeCompare(b.row.name, 'ko'),
      );

    const toItem = ({ id, name }: TeamSearchRow): TeamSearchItem => ({
      id,
      name,
    });
    const exact = sorted.find((s) => s.rank === 0)?.row;
    return {
      problem,
      exact: exact ? toItem(exact) : null,
      matches: sorted.slice(0, TEAM_SEARCH_LIMIT).map((s) => toItem(s.row)),
    };
  }

    // 팀 만들기 (등록·자동 등록 공용): 이름 검사 → 겹침 확인 → 해시 → 저장
    async create(name: string, password: string): Promise<Team> {
        assertValidTeamName(name);
        const nameKey = normalizeName(name);
        await this.assertNameKeyFree(nameKey);

        const hashedPassword = await bcrypt.hash(password, 10);

        return this.withNameConflict(() =>
            this.prisma.team.create({
                data: { name, nameKey, password: hashedPassword },
            }),
        );
    }

    // 팀명 변경
    async updateName(id: string, name: string): Promise<{ message: string }> {
        // 팀 존재 여부 확인 (관리자 토큰 등 잘못된 ID 접근 방어)
        const team = await this.prisma.team.findUnique({ where: { id } });
        if (!team) {
            throw new NotFoundException('팀을 찾을 수 없습니다.');
        }

        assertValidTeamName(name);
        const nameKey = normalizeName(name);
        await this.assertNameKeyFree(nameKey, id);

        await this.withNameConflict(() =>
            this.prisma.team.update({
                where: { id },
                data: { name, nameKey },
            }),
        );

        return { message: '팀명이 변경되었습니다.' };
    }

    // 비교용 이름이 같은 다른 팀이 있으면 409
    private async assertNameKeyFree(nameKey: string, exceptId?: string): Promise<void> {
        const existing = await this.prisma.team.findUnique({ where: { nameKey } });
        if (existing && existing.id !== exceptId) {
            throw new ConflictException(TEAM_NAME_TAKEN);
        }
    }

    // 동시에 같은 비교용 이름으로 저장하면 겹침 제약(P2002)이 걸림 → 같은 409로 바꿈
    private async withNameConflict<T>(write: () => Promise<T>): Promise<T> {
        try {
            return await write();
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException(TEAM_NAME_TAKEN);
            }
            throw e;
        }
    }

    // 비밀번호 변경 (기존 비밀번호 검증 포함)
    async updatePassword(id: string, dto: UpdatePasswordDto): Promise<{ message: string; access_token: string }> {
        const team = await this.prisma.team.findUnique({ where: { id } });
        if (!team) {
            throw new NotFoundException('팀을 찾을 수 없습니다.');
        }

        // 기존 비밀번호 확인
        const isMatch = await bcrypt.compare(dto.currentPassword, team.password);
        if (!isMatch) {
            throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // 비밀번호 업데이트 및 tokenVersion 증가
        const updatedTeam = await this.prisma.team.update({
            where: { id },
            data: {
                password: hashedPassword,
                tokenVersion: { increment: 1 }
            },
        });

        // 새 토큰 발급 (로그인 유지용)
        const payload = {
            sub: updatedTeam.id,
            username: updatedTeam.name,
            role: updatedTeam.role,
            v: updatedTeam.tokenVersion
        };
        const newToken = this.jwtService.sign(payload, { expiresIn: TEAM_TOKEN_EXPIRY });

        return {
            message: '비밀번호가 변경되었습니다.',
            access_token: newToken
        };
    }

    // 팀 삭제 (탈퇴)
    async delete(id: string): Promise<{ message: string }> {
        await this.prisma.team.delete({
            where: { id },
        });

        return { message: '팀이 삭제되었습니다.' };
    }
}
