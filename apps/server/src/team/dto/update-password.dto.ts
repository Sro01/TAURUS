import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
    @ApiProperty({ description: '현재 비밀번호', example: 'oldPass123!' })
    @IsString()
    @IsNotEmpty({ message: '현재 비밀번호는 필수입니다.' })
    currentPassword!: string;

    @ApiProperty({ description: '새 비밀번호', example: 'newPass123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(4, { message: '비밀번호는 최소 4자 이상이어야 합니다.' })
    @Matches(/^[a-zA-Z0-9!@#$%^&*]*$/, {
        message: '비밀번호는 영문, 숫자, 특수문자(!@#$%^&*)만 사용할 수 있습니다.',
    })
    password!: string;
}
