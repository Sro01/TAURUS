import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

/** 길이(기간 일수)·값 범위는 방을 알아야 해서 서비스가 jam-slots.ts의 slotsError로 검사 */
export class SaveSlotsDto {
  @ApiProperty({
    description: '날짜마다 14비트 정수. 길이 = 기간 일수, 0 ≤ 값 < 16384',
    example: [0, 0, 1984, 0, 0, 0, 0],
    type: [Number],
  })
  @IsArray({ message: '가능 시간 값이 올바르지 않아요' })
  @IsInt({ each: true, message: '가능 시간 값이 올바르지 않아요' })
  slots!: number[];
}
