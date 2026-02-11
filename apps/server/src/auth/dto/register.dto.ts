import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ description: '팀 이름 (로그인 ID로 사용)', example: '오아시스' })
    @IsString()
    @IsNotEmpty({ message: '팀 이름은 필수입니다.' })
    name!: string; // 팀명 (ID로 사용)

    @ApiProperty({ description: '비밀번호', example: '1001' })
    @IsString()
    @IsNotEmpty({ message: '비밀번호는 필수입니다.' })
    @MinLength(4, { message: '비밀번호는 최소 4자 이상이어야 합니다.' })
    @Matches(/^[a-zA-Z0-9!@#$%^&*]*$/, {
        message: '비밀번호는 영문, 숫자, 특수문자(!@#$%^&*)만 사용할 수 있습니다.',
    })
    password!: string;

}
