import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
    @ApiProperty()
    page!: number;

    @ApiProperty()
    size!: number;

    @ApiProperty()
    totalElements!: number;

    @ApiProperty()
    totalPages!: number;
}

export class CommonResponseDto<T> {
    @ApiProperty({ example: 'SUCCESS' })
    code!: string;

    @ApiProperty({ example: '요청이 성공적으로 처리되었습니다.' })
    message!: string;

    @ApiProperty({ nullable: true })
    data!: T | null;
}

export class PaginationResponseDto<T> {
    @ApiProperty({ isArray: true })
    contents!: T[];

    @ApiProperty()
    pagination!: PaginationMetaDto;
}
