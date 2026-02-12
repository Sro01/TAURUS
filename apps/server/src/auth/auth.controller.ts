import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyDto } from './dto/verify.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: '팀 등록' })
    @ApiResponse({ status: 201, description: '팀 등록 성공' })
    @ApiResponse({ status: 409, description: '이미 존재하는 팀 이름' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('verify')
    @ApiOperation({ summary: '팀 인증 (비밀번호 확인 → 세션 토큰 발급, 15분)' })
    @ApiResponse({ status: 200, description: '인증 성공 (토큰 발급)' })
    @ApiResponse({ status: 401, description: '인증 실패 (미등록 or 비밀번호 불일치)' })
    async verify(@Body() dto: VerifyDto) {
        return this.authService.verify(dto);
    }
}
