import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WeekService } from './week.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Week')
@Controller('weeks')
export class WeekController {
    constructor(private readonly weekService: WeekService) { }

    @Get('main')
    @ApiOperation({ summary: '메인 주차(이번 주/다음 주) 조회' })
    @ApiResponse({ status: 200, description: '조회 성공' })
    async getMainWeeks() {
        return this.weekService.getMainWeeks();
    }

    @Get()
    @ApiOperation({ summary: '전체 주차 목록 조회' })
    @ApiResponse({ status: 200, description: '조회 성공' })
    async findAll() {
        return this.weekService.findAll();
    }

    @Post('rotation')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '주차 강제 전환 (테스트용, 인증 필요)' })
    @ApiResponse({ status: 201, description: '전환 성공' })
    @ApiResponse({ status: 401, description: '인증 필요' })
    async rotation() {
        return this.weekService.rotation();
    }
}
