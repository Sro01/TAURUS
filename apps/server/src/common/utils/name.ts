// 팀·참여자 이름 규칙 공용 함수. Nest 의존 없음.

// 비교용 이름에 남기는 글자: 숫자, 영문, 한글 완성형
const NAME_KEY_DROP = /[^0-9A-Za-z가-힣]/g;

// 따로 들어간 한글 자음·모음: 호환 자모(U+3131–318E), 첫가끝 자모(U+1100–11FF)
const LOOSE_JAMO = /[ㄱ-ㆎᄀ-ᇿ]/;

/**
 * 비교용 이름. NFC 정규화 → 숫자·영문·한글 완성형만 남김 → 소문자.
 * 마이그레이션 `team_name_key`의 SQL과 결과가 같아야 한다.
 * (남긴 뒤에 소문자로 바꿔서 영문 A–Z만 소문자 변환을 거친다 → DB 로케일과 무관)
 */
export function normalizeName(s: string): string {
  return s.normalize('NFC').replace(NAME_KEY_DROP, '').toLowerCase();
}

/** 한글 자음·모음이 하나라도 따로 들어갔는지 (NFC 정규화 뒤 검사) */
export function hasLooseJamo(s: string): boolean {
  return LOOSE_JAMO.test(s.normalize('NFC'));
}
