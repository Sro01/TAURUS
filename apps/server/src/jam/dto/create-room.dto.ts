import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export const JAM_RANGES = ['this', 'next', 'both'] as const;
export type JamRange = (typeof JAM_RANGES)[number];

/** 방 제목: 앞뒤 공백 제거 후 1~15자 */
export function JamTitle() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsString({ message: '제목은 1~15자로 써 주세요' }),
    Length(1, 15, { message: '제목은 1~15자로 써 주세요' }),
  );
}

/** 인원 숫자: 1~30명 (null 허용 여부는 각 DTO의 ValidateIf가 정함) */
export function JamHeadcount() {
  const message = '인원은 1~30명으로 정해 주세요';
  return applyDecorators(
    IsInt({ message }),
    Min(1, { message }),
    Max(30, { message }),
  );
}

export class CreateRoomDto {
  @ApiProperty({ description: '방 제목 (1~15자)', example: '신곡 첫 합주' })
  @JamTitle()
  title!: string;

  @ApiProperty({
    description: '인원 1~30, null = 아직 몰라요',
    example: 5,
    nullable: true,
    type: Number,
  })
  @ValidateIf((o: CreateRoomDto) => o.headcount !== null) // null = 아직 몰라요. 키가 없으면 400
  @JamHeadcount()
  headcount!: number | null;

  @ApiProperty({ description: '기간', enum: JAM_RANGES, example: 'this' })
  @IsIn(JAM_RANGES, { message: '기간을 골라 주세요' })
  range!: JamRange;
}
