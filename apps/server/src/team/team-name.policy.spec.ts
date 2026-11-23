import { BadRequestException } from '@nestjs/common';
import { assertValidTeamName, teamNameProblem } from './team-name.policy';

// 이름 → 기대 판정
const CASES: [string, ReturnType<typeof teamNameProblem>][] = [
  ['FIGHTMAN', null],
  ['Fight Man!', null],
  ['브로콜리너마저', null],
  ['밴드1', null],
  ['밴드ㅋ', 'LOOSE_JAMO'],
  ['ㅇㅌㅍㄹㅈ', 'LOOSE_JAMO'],
  ['안티ㅡ프', 'LOOSE_JAMO'],
  ['ᄒᆞᆫ', 'LOOSE_JAMO'], // 첫가끝 자모
  ['ㅋ!!', 'LOOSE_JAMO'], // 자음·모음이 먼저
  ['!!! ', 'EMPTY_KEY'],
  ['🎸', 'EMPTY_KEY'],
  ['', 'EMPTY_KEY'],
];

describe('team-name.policy', () => {
  it.each(CASES)('teamNameProblem(%p) → %p', (name, expected) => {
    expect(teamNameProblem(name)).toBe(expected);
  });

  it.each(CASES)(
    'assertValidTeamName(%p)는 teamNameProblem과 같은 판정',
    (name, expected) => {
      if (expected === null) {
        expect(() => assertValidTeamName(name)).not.toThrow();
      } else {
        expect(() => assertValidTeamName(name)).toThrow(BadRequestException);
      }
    },
  );

  it('예외 메시지는 그대로', () => {
    expect(() => assertValidTeamName('밴드ㅋ')).toThrow(
      '한글 자음·모음만 따로 쓴 팀 이름은 쓸 수 없어요.',
    );
    expect(() => assertValidTeamName('★★')).toThrow(
      '팀 이름에 한글, 영문, 숫자를 한 글자 이상 넣어 주세요.',
    );
  });
});
