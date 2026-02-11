import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNameDto {
    @ApiProperty({ description: '새 팀명', example: '병아리밴드' })
    @IsString()
    @IsNotEmpty({ message: '팀 이름은 필수입니다.' })
    name!: string;
}
