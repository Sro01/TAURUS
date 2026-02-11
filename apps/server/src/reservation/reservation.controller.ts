import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateInstantReservationDto } from './dto/create-instant-reservation.dto';
import { CreatePreReservationDto } from './dto/create-pre-reservation.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Reservation')
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) { }

  // 바로 예약 — README 2번
  @Post('instant')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '바로 예약 (선착순, 즉시 확정)' })
  @ApiResponse({ status: 201, description: '예약 성공' })
  @ApiResponse({ status: 400, description: '유효하지 않은 슬롯 / 제한 초과' })
  @ApiResponse({ status: 409, description: '이미 예약된 시간대' })
  async createInstant(@Request() req: any, @Body() dto: CreateInstantReservationDto) {
    return this.reservationService.createInstant(req.user.id, dto);
  }

  // 미리 예약 — README 3번
  @Post('pre')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '미리 예약 (다음 주차, PENDING 상태)' })
  @ApiResponse({ status: 201, description: '예약 신청 성공' })
  @ApiResponse({ status: 400, description: '유효하지 않은 슬롯 / 제한 초과' })
  async createPre(@Request() req: any, @Body() dto: CreatePreReservationDto) {
    return this.reservationService.createPre(req.user.id, dto);
  }

  // 내 예약 현황 — README 4-2
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 예약 현황 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async findMyReservations(@Request() req: any) {
    return this.reservationService.findMyReservations(req.user.id);
  }

  // 주차별 예약 현황 (공개) — 바로 예약: 팀명 / 미리 예약: 팀 수
  @Get('week/:week')
  @ApiOperation({ summary: '주차별 예약 현황 조회 (바로: 팀명 공개, 미리: 팀 수만)' })
  @ApiParam({ name: 'week', description: '"current" (이번 주), "next" (다음 주), 또는 주차번호 (예: 7)', example: 'current' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async findByWeek(@Param('week') week: string) {
    return this.reservationService.findByWeek(week);
  }

  // 예약 취소 — README 4-2
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '예약 취소 (본인 예약만)' })
  @ApiParam({ name: 'id', description: '예약 ID' })
  @ApiResponse({ status: 200, description: '취소 성공' })
  @ApiResponse({ status: 403, description: '본인 예약이 아님' })
  async cancel(@Request() req: any, @Param('id') id: string) {
    return this.reservationService.cancel(req.user.id, id);
  }
}
