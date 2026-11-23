import { hasLooseJamo, normalizeName } from './name';

// SQL(마이그레이션 team_name_key)과 같은 결과인지는 비교표
// test/team-name-key.e2e-spec.ts가 실제 Postgres에 돌려 확인한다.

describe('normalizeName', () => {
  it.each([
    ['FIGHTMAN', 'fightman'],
    ['최유라와 노인들', '최유라와노인들'],
    ['청색동경.', '청색동경'],
    ['안티ㅡ프', '안티프'],
    ['ㅇㅌㅍㄹㅈ', ''],
    ['\u1112\u1161\u11ab', '한'], // 첫가끝(NFD) → NFC 완성형
    ['ÀBC', 'bc'],
    ['🎸밴드', '밴드'],
  ])('%j → %j', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });
});

describe('hasLooseJamo', () => {
  it.each([
    ['ㅇㅌㅍㄹㅈ', true],
    ['안티ㅡ프', true],
    ['밴드ㅋ', true],
    ['ᄀ', true], // 첫가끝 초성 하나
    ['한', false], // NFD 완성형 '한' → NFC로 합쳐짐
    ['한글밴드', false],
    ['FIGHTMAN', false],
    ['청색동경.', false],
  ])('%j → %s', (input, expected) => {
    expect(hasLooseJamo(input)).toBe(expected);
  });
});
