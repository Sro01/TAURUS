import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: '팀 등록 (회원가입)' })
    @ApiResponse({ status: 201, description: '팀 등록 성공' })
    @ApiResponse({ status: 409, description: '이미 존재하는 팀 이름' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @ApiOperation({ summary: '로그인' })
    @ApiResponse({ status: 200, description: '로그인 성공 (토큰 발급)' })
    @ApiResponse({ status: 401, description: '인증 실패' })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }
}
