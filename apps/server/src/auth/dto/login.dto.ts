import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ description: '팀 이름', example: '오아시스' })
    @IsString()
    @IsNotEmpty()
    name!: string;

    @ApiProperty({ description: '비밀번호', example: '1001' })
    @IsString()
    @IsNotEmpty()
    password!: string;
}
