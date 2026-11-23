import { BadRequestException } from '@nestjs/common';
import { hasLooseJamo, normalizeName } from '../common/utils/name';

/** 팀 이름 금지 규칙. 어기면 400 */
export function assertValidTeamName(name: string): void {
  if (hasLooseJamo(name)) {
    throw new BadRequestException(
      '한글 자음·모음만 따로 쓴 팀 이름은 쓸 수 없어요.',
    );
  }
  if (normalizeName(name) === '') {
    throw new BadRequestException(
      '팀 이름에 한글, 영문, 숫자를 한 글자 이상 넣어 주세요.',
    );
  }
}
