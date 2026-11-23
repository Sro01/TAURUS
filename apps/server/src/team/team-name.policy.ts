import { BadRequestException } from '@nestjs/common';
import { hasLooseJamo, normalizeName } from '../common/utils/name';

/** 팀 이름 금지 사유. LOOSE_JAMO = 자음·모음이 따로 들어감, EMPTY_KEY = 비교용 이름이 빈 값 */
export type TeamNameProblem = 'LOOSE_JAMO' | 'EMPTY_KEY';

const PROBLEM_MESSAGES: Record<TeamNameProblem, string> = {
  LOOSE_JAMO: '한글 자음·모음만 따로 쓴 팀 이름은 쓸 수 없어요.',
  EMPTY_KEY: '팀 이름에 한글, 영문, 숫자를 한 글자 이상 넣어 주세요.',
};

/** 팀 이름 금지 규칙. 쓸 수 있으면 null */
export function teamNameProblem(name: string): TeamNameProblem | null {
  if (hasLooseJamo(name)) return 'LOOSE_JAMO';
  if (normalizeName(name) === '') return 'EMPTY_KEY';
  return null;
}

/** 팀 이름 금지 규칙. 어기면 400 */
export function assertValidTeamName(name: string): void {
  const problem = teamNameProblem(name);
  if (problem) {
    throw new BadRequestException(PROBLEM_MESSAGES[problem]);
  }
}
