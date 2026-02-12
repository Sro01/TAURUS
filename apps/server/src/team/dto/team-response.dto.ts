import { ApiProperty } from '@nestjs/swagger';
import { Team } from '@prisma/client';

export class TeamResponseDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    name!: string;

    @ApiProperty()
    role!: string;

    @ApiProperty()
    createdAt!: Date;

    constructor(team: Team) {
        this.id = team.id;
        this.name = team.name;
        this.role = team.role;
        this.createdAt = team.createdAt;
    }
}
