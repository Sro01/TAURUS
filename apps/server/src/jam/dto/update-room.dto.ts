import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateIf } from 'class-validator';
import { JamHeadcount, JamTitle } from './create-room.dto';

/** 키가 없으면 안 바꿈. headcount: null = 아직 몰라요 */
export class UpdateRoomDto {
  @ApiPropertyOptional({ description: '방 제목 (1~15자)' })
  @IsOptional()
  @JamTitle()
  title?: string;

  @ApiPropertyOptional({
    description: '인원 1~30, null = 아직 몰라요, 키 없음 = 안 바꿈',
    nullable: true,
    type: Number,
  })
  @ValidateIf(
    (o: UpdateRoomDto) => o.headcount !== null && o.headcount !== undefined,
  )
  @JamHeadcount()
  headcount?: number | null;
}
