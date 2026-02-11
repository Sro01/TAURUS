import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    // 팀 등록 (회원가입)
    async register(dto: RegisterDto) {
        // 1. 중복 확인
        const existingTeam = await this.prisma.team.findUnique({
            where: { name: dto.name },
        });
        if (existingTeam) {
            throw new ConflictException('이미 존재하는 팀 이름입니다.');
        }

        // 2. 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // 3. DB 저장
        const team = await this.prisma.team.create({
            data: {
                name: dto.name,
                password: hashedPassword,
                description: dto.description,
            },
        });

        // 4. 결과 반환 (비밀번호 제외)
        return {
            id: team.id,
            name: team.name,
            message: '팀 등록이 완료되었습니다.',
        };
    }

    // 로그인
    async login(dto: LoginDto) {
        // 1. 팀 조회
        const team = await this.prisma.team.findUnique({
            where: { name: dto.name },
        });

        // 2. 정보 확인 및 비밀번호 검증
        if (!team || !(await bcrypt.compare(dto.password, team.password))) {
            throw new UnauthorizedException('팀 이름 또는 비밀번호가 잘못되었습니다.');
        }

        // 3. 토큰 발급
        const payload = { sub: team.id, username: team.name, role: team.role };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
