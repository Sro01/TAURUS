import { describe, it, expect } from 'vitest';
import { getTeamNameHint, TEAM_NAME_MESSAGES, type TeamNameSearch } from './teamNameHint';
import type { TeamSearchResponse } from '../types/team';

const FIGHTMAN = { id: 't1', name: 'FIGHTMAN' };
const BROCCOLI = { id: 't2', name: '브로콜리' };

const searchOf = (query: string, response: Partial<TeamSearchResponse>): TeamNameSearch => ({
  query,
  response: { problem: null, exact: null, matches: [], ...response },
});

describe('getTeamNameHint', () => {
  describe('problem', () => {
    it('LOOSE_JAMO: 오류 문구, 제출을 막아요', () => {
      const h = getTeamNameHint(searchOf('ㅎㅎ', { problem: 'LOOSE_JAMO' }), 'ㅎㅎ');
      expect(h.message).toBe('한글 자음·모음만 따로 쓸 수 없어요');
      expect(h.isError).toBe(true);
      expect(h.blocked).toBe(true);
      expect(h.items).toEqual([]);
      expect(h.showNewTeam).toBe(false);
    });

    it('EMPTY_KEY: 오류 문구, 제출을 막아요', () => {
      const h = getTeamNameHint(searchOf('!!', { problem: 'EMPTY_KEY' }), '!!');
      expect(h.message).toBe('한글, 영문, 숫자를 한 글자 이상 넣어 주세요');
      expect(h.isError).toBe(true);
      expect(h.blocked).toBe(true);
    });
  });

  describe('exact', () => {
    it('입력 표기와 다르면 "<이름> 팀으로 예약돼요", 제출은 되고 보낼 이름은 exact.name', () => {
      const h = getTeamNameHint(searchOf('fightman', { exact: FIGHTMAN, matches: [FIGHTMAN] }), 'fightman');
      expect(h.message).toBe('FIGHTMAN 팀으로 예약돼요');
      expect(h.isError).toBe(false);
      expect(h.blocked).toBe(false);
      expect(h.submitName).toBe('FIGHTMAN');
    });

    it('띄어쓰기만 다른 입력도 문자열이 다르면 exact.name으로 보내요', () => {
      const h = getTeamNameHint(searchOf('Fight Man', { exact: FIGHTMAN, matches: [FIGHTMAN] }), 'Fight Man');
      expect(h.message).toBe('FIGHTMAN 팀으로 예약돼요');
      expect(h.submitName).toBe('FIGHTMAN');
    });

    it('표기도 같으면 "등록된 팀"', () => {
      const h = getTeamNameHint(searchOf('FIGHTMAN', { exact: FIGHTMAN, matches: [FIGHTMAN] }), 'FIGHTMAN');
      expect(h.message).toBe('등록된 팀');
      expect(h.isError).toBe(false);
      expect(h.blocked).toBe(false);
      expect(h.submitName).toBe('FIGHTMAN');
    });

    it('드롭다운을 열지 않아요 (목록 항목도 새 팀 줄도 없음)', () => {
      const h = getTeamNameHint(searchOf('fight', { exact: FIGHTMAN, matches: [FIGHTMAN, BROCCOLI] }), 'fight');
      expect(h.items).toEqual([]);
      expect(h.showNewTeam).toBe(false);
      expect(h.registered).toBe(true);
    });
  });

  describe('exact 없음', () => {
    it('matches가 있으면 드롭다운 목록과 새 팀 줄, 입력값 그대로 제출', () => {
      const h = getTeamNameHint(searchOf('브로', { matches: [BROCCOLI] }), '브로');
      expect(h.items).toEqual([BROCCOLI]);
      expect(h.showNewTeam).toBe(true);
      expect(h.registered).toBe(false);
      expect(h.blocked).toBe(false);
      expect(h.submitName).toBe('브로');
    });

    it('matches도 없으면 "새 팀으로 예약돼요", 드롭다운 없음', () => {
      const h = getTeamNameHint(searchOf('새팀', {}), '새팀');
      expect(h.message).toBe('새 팀으로 예약돼요');
      expect(h.isError).toBe(false);
      expect(h.items).toEqual([]);
      expect(h.showNewTeam).toBe(false);
      expect(h.blocked).toBe(false);
      expect(h.submitName).toBe('새팀');
    });
  });

  describe('응답 전, 요청 실패, 빈 입력', () => {
    it('응답이 없으면 표시 없이 입력값 그대로 제출돼요', () => {
      const h = getTeamNameHint(null, 'fightman');
      expect(h).toEqual({
        message: null,
        isError: false,
        blocked: false,
        submitName: 'fightman',
        registered: false,
        items: [],
        showNewTeam: false,
      });
    });

    it('빈 입력이면 표시가 없어요', () => {
      const h = getTeamNameHint(searchOf('', { exact: FIGHTMAN }), '');
      expect(h.message).toBeNull();
      expect(h.submitName).toBe('');
    });
  });

  describe('지금 입력값에 대한 응답이 아닐 때', () => {
    it('앞 입력의 exact로 이름을 바꾸지 않아요', () => {
      const h = getTeamNameHint(searchOf('fightman', { exact: FIGHTMAN, matches: [FIGHTMAN] }), 'fightmanX');
      expect(h.message).toBeNull();
      expect(h.submitName).toBe('fightmanX');
      expect(h.registered).toBe(false);
      expect(h.items).toEqual([]);
    });

    it('앞 입력의 problem으로 제출을 막지 않아요', () => {
      const h = getTeamNameHint(searchOf('ㅎㅎ', { problem: 'LOOSE_JAMO' }), '한글');
      expect(h.blocked).toBe(false);
      expect(h.isError).toBe(false);
      expect(h.message).toBeNull();
      expect(h.submitName).toBe('한글');
    });

    it('대소문자만 다른 입력도 같은 입력으로 보지 않아요 (문자열이 그대로 같을 때만)', () => {
      const h = getTeamNameHint(searchOf('fightman', { exact: FIGHTMAN }), 'FIGHTMAN');
      expect(h.message).toBeNull();
      expect(h.submitName).toBe('FIGHTMAN');
    });
  });
});

describe('TEAM_NAME_MESSAGES', () => {
  it('표 4.2 문구', () => {
    expect(TEAM_NAME_MESSAGES.registered).toBe('등록된 팀');
    expect(TEAM_NAME_MESSAGES.newTeam).toBe('새 팀으로 예약돼요');
  });
});
