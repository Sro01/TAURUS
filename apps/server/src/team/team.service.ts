import { Injectable, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateNameDto } from './dto/update-name.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TeamService {
    constructor(private prisma: PrismaService) { }

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

    // 팀명 변경
    async updateName(id: string, dto: UpdateNameDto): Promise<{ message: string }> {
        // 팀 존재 여부 확인 (관리자 토큰 등 잘못된 ID 접근 방어)
        const team = await this.prisma.team.findUnique({ where: { id } });
        if (!team) {
            throw new NotFoundException('팀을 찾을 수 없습니다.');
        }

        // 중복 확인
        const existing = await this.prisma.team.findUnique({
            where: { name: dto.name },
        });
        if (existing && existing.id !== id) {
            throw new ConflictException('이미 존재하는 팀 이름입니다.');
        }

        await this.prisma.team.update({
            where: { id },
            data: { name: dto.name },
        });

        return { message: '팀명이 변경되었습니다.' };
    }

    // 비밀번호 변경 (기존 비밀번호 검증 포함)
    async updatePassword(id: string, dto: UpdatePasswordDto): Promise<{ message: string }> {
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
        await this.prisma.team.update({
            where: { id },
            data: { password: hashedPassword },
        });

        return { message: '비밀번호가 변경되었습니다.' };
    }

    // 팀 삭제 (탈퇴)
    async delete(id: string): Promise<{ message: string }> {
        await this.prisma.team.delete({
            where: { id },
        });

        return { message: '팀이 삭제되었습니다.' };
    }
}
