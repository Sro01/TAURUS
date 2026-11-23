import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRoomDto } from './dto/create-room.dto';
import { EnterDto } from './dto/enter.dto';
import { SaveSlotsDto } from './dto/save-slots.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JamService } from './jam.service';
import { JamRequest, JamTokenGuard } from './jam-token.guard';

const JamTokenHeader = () =>
  ApiHeader({ name: 'X-Jam-Token', description: '방 출입증', required: true });

@ApiTags('Jam')
@Controller('jam-rooms')
export class JamController {
  constructor(private readonly jamService: JamService) {}

  @Post()
  @ApiOperation({ summary: '방 만들기' })
  @ApiResponse({ status: 201, description: '{ slug }' })
  @ApiResponse({ status: 400, description: '제목·인원·기간 검사 실패' })
  async createRoom(@Body() dto: CreateRoomDto) {
    return this.jamService.createRoom(dto);
  }

  @Get(':slug')
  @ApiOperation({ summary: '방 + 참여자 전부' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  @ApiResponse({ status: 404, description: '없는 방' })
  async getRoom(@Param('slug') slug: string) {
    return this.jamService.getRoom(slug);
  }

  @Patch(':slug')
  @UseGuards(JamTokenGuard)
  @JamTokenHeader()
  @ApiOperation({ summary: '제목·인원 바꾸기' })
  @ApiResponse({ status: 200, description: '바뀐 방' })
  @ApiResponse({ status: 400, description: '참여한 사람보다 적은 인원' })
  @ApiResponse({ status: 401, description: '출입증 없음·무효' })
  @ApiResponse({ status: 403, description: '끝난 방, 다른 방 출입증' })
  async updateRoom(
    @Param('slug') slug: string,
    @Req() req: JamRequest,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.jamService.updateRoom(slug, req.jam, dto);
  }

  @Post(':slug/participants')
  @ApiOperation({ summary: '이름 + 비밀번호로 들어오기' })
  @ApiResponse({ status: 201, description: '{ token, participant }' })
  @ApiResponse({ status: 400, description: '이름 규칙 위반' })
  @ApiResponse({ status: 401, description: '비밀번호가 맞지 않아요' })
  @ApiResponse({ status: 403, description: '끝난 방에 새 이름' })
  async enter(@Param('slug') slug: string, @Body() dto: EnterDto) {
    return this.jamService.enter(slug, dto);
  }

  @Put(':slug/participants/me/slots')
  @UseGuards(JamTokenGuard)
  @JamTokenHeader()
  @ApiOperation({ summary: '내 가능 칸 통째로 저장' })
  @ApiResponse({ status: 200, description: '저장한 참여자' })
  @ApiResponse({ status: 400, description: '길이·값 검사 실패' })
  @ApiResponse({ status: 403, description: '끝난 방, 다른 방 출입증' })
  async saveMySlots(@Req() req: JamRequest, @Body() dto: SaveSlotsDto) {
    return this.jamService.saveMySlots(req.jam, dto);
  }

  @Delete(':slug/participants/me')
  @UseGuards(JamTokenGuard)
  @JamTokenHeader()
  @ApiOperation({ summary: '나 빠지기' })
  @ApiResponse({ status: 200, description: '빠짐' })
  @ApiResponse({ status: 403, description: '끝난 방, 다른 방 출입증' })
  async leave(@Req() req: JamRequest) {
    return this.jamService.leave(req.jam);
  }
}
