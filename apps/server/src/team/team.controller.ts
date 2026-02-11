import { Controller, Get, Body, Query, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { TeamService } from './team.service';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Team')
@Controller('teams')
export class TeamController {
    constructor(private readonly teamService: TeamService) { }

    @Get()
    @ApiOperation({ summary: '전체 팀 목록 조회' })
    @ApiQuery({ name: 'search', required: false, description: '팀 이름 검색어' })
    @ApiResponse({ status: 200, description: '조회 성공' })
    async findAll(@Query('search') search?: string) {
        return this.teamService.findAll(search);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '내 팀 정보 조회' })
    @ApiResponse({ status: 200, description: '조회 성공' })
    async findMe(@Request() req: any) {
        return this.teamService.findOne(req.user.id);
    }

    @Patch('me/password')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '비밀번호 변경' })
    @ApiResponse({ status: 200, description: '변경 성공' })
    async updatePassword(@Request() req: any, @Body() dto: UpdatePasswordDto) {
        return this.teamService.updatePassword(req.user.id, dto);
    }

    @Delete('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '팀 탈퇴 (계정 삭제)' })
    @ApiResponse({ status: 200, description: '삭제 성공' })
    async deleteMe(@Request() req: any) {
        return this.teamService.delete(req.user.id);
    }
}
