import { Controller, Post, Body, Get, Patch, Delete, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminVerifyDto } from './dto/admin-verify.dto';
import { CreateAdminReservationDto } from './dto/create-admin-reservation.dto';
import { AdminReservationPreviewDto, CreateAdminReservationsResultDto } from './dto/admin-reservation-result.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Post('verify')
    @ApiOperation({ summary: '관리자 인증 (마스터 패스워드 → 세션 토큰 발급, 1시간)' })
    @ApiResponse({ status: 200, description: 'JWT 토큰 발급' })
    async verify(@Body() dto: AdminVerifyDto) {
        return this.adminService.verify(dto);
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

    @Post('reservations/preview')
    @HttpCode(200)
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '관리자 우선 예약 미리 보기 (바꾸지 않음). 건너뛸 칸과 팀 예약이 취소될 칸' })
    @ApiResponse({ status: 200, type: AdminReservationPreviewDto })
    async previewAdminReservations(@Body() dto: CreateAdminReservationDto) {
        return this.adminService.previewAdminReservations(dto);
    }

    @Post('reservations')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '관리자 우선 예약 생성 (여러 칸 한 번에, CONFIRMED_ADMIN). 이미 관리자 예약이 있는 칸은 건너뜀' })
    @ApiResponse({ status: 201, type: CreateAdminReservationsResultDto })
    async createAdminReservations(@Body() dto: CreateAdminReservationDto) {
        return this.adminService.createAdminReservations(dto);
    }

    @Get('reservations/team/:teamId')
    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: '특정 팀의 예약 내역 조회' })
    async getReservationsByTeam(@Param('teamId') teamId: string) {
        return this.adminService.getReservationsByTeam(teamId);
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
