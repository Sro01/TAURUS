import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TeamNameProblem } from '../team-name.policy';

export const TEAM_SEARCH_Q_MAX = 32;

export class SearchTeamQueryDto {
  @ApiPropertyOptional({
    description: '입력한 팀 이름 (최대 32자)',
    example: 'fightman',
    default: '',
  })
  @IsOptional()
  @IsString({ message: '팀 이름은 글자로 넣어 주세요.' })
  @MaxLength(TEAM_SEARCH_Q_MAX, {
    message: '팀 이름은 32자까지 넣을 수 있어요.',
  })
  q: string = '';
}

export type TeamSearchItem = { id: string; name: string };

export type TeamSearchResult = {
  problem: TeamNameProblem | null;
  exact: TeamSearchItem | null;
  matches: TeamSearchItem[];
};
