import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyDto {
    @ApiProperty({ description: '팀 이름', example: '오아시스' })
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ApiProperty({ description: '비밀번호', example: '1001' })
    @IsString()
    @IsNotEmpty()
    password!: string;

    @ApiPropertyOptional({
        description: '미등록 팀일 경우 자동 등록 여부 (바로 예약: true, 미리 예약: false)',
        example: false,
        default: false,
    })
    @IsBoolean()
    @IsOptional()
    autoRegister?: boolean;
}
