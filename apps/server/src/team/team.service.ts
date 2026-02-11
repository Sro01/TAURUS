import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamResponseDto } from './dto/team-response.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
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

    // 비밀번호 변경
    async updatePassword(id: string, dto: UpdatePasswordDto): Promise<void> {
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        await this.prisma.team.update({
            where: { id },
            data: { password: hashedPassword },
        });
    }

    // 팀 삭제 (탈퇴)
    async delete(id: string): Promise<void> {
        await this.prisma.team.delete({
            where: { id },
        });
    }
}
