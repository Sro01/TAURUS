import { Controller, Post, Body, Get, Patch, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminReservationDto } from './dto/create-admin-reservation.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './guards/admin.guard';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Post('login')
    @ApiOperation({ summary: '관리자 로그인 (마스터 패스워드)' })
    @ApiResponse({ status: 200, description: 'JWT 토큰 발급' })
    async login(@Body() dto: AdminLoginDto) {
        return this.adminService.login(dto);
    }

    // 이하 모든 요청은 관리자 권한 필요
    @Get('settings')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '시스템 설정 조회' })
    async getSettings() {
        return this.adminService.getSettings();
    }

    @Patch('settings')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '시스템 설정 변경 (MaxSlotsPerWeek)' })
    async updateSettings(@Body() dto: UpdateSettingsDto) {
        return this.adminService.updateSettings(dto);
    }

    @Post('reservations')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '관리자 우선 예약 생성 (CONFIRMED_ADMIN)' })
    async createAdminReservation(@Body() dto: CreateAdminReservationDto) {
        return this.adminService.createAdminReservation(dto);
    }

    @Delete('reservations/:id')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '예약 강제 취소' })
    async cancelReservation(@Param('id') id: string) {
        return this.adminService.cancelReservation(id);
    }

    @Delete('teams/:id')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '팀 강제 삭제' })
    async deleteTeam(@Param('id') id: string) {
        return this.adminService.deleteTeam(id);
    }
}
