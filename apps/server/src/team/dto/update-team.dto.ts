import { IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTeamDto {
    @ApiProperty({ description: '새 비밀번호 (선택)', example: 'newPass123!', required: false })
    @IsOptional()
    @IsString()
    @MinLength(4, { message: '비밀번호는 최소 4자 이상이어야 합니다.' })
    @Matches(/^[a-zA-Z0-9!@#$%^&*]*$/, {
        message: '비밀번호는 영문, 숫자, 특수문자(!@#$%^&*)만 사용할 수 있습니다.',
    })
    password?: string;
}
