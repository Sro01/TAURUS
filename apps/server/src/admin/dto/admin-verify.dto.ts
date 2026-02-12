import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminVerifyDto {
    @ApiProperty({ description: '관리자 마스터 패스워드', example: 'admin1234' })
    @IsString()
    @IsNotEmpty({ message: '패스워드는 필수입니다.' })
    password!: string;
}
