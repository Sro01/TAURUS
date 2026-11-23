import type { TeamSearchItem, TeamSearchResponse } from '@/types/team';

/** 서버 응답과, 그 응답을 받을 때 보낸 입력값 */
export interface TeamNameSearch {
  query: string;
  response: TeamSearchResponse;
}

/** 팀 이름 칸 아래에 보여 줄 것과 제출 때 쓸 값 */
export interface TeamNameHint {
  /** 입력 아래 문구. 없으면 null */
  message: string | null;
  /** true면 오류 색 */
  isError: boolean;
  /** true면 제출을 막아요 (서버가 `problem`을 준 경우만) */
  blocked: boolean;
  /** 제출 때 보낼 이름 (`exact`가 있으면 `exact.name`, 아니면 입력값 그대로) */
  submitName: string;
  /** 드롭다운에 보여 줄 비슷한 팀 (`exact`가 있으면 비어 있어요. 드롭다운은 `exact`가 없을 때만 열려요) */
  items: TeamSearchItem[];
  /** 드롭다운 맨 아래 "새 팀으로 예약" 줄을 보일지 */
  showNewTeam: boolean;
}

export const TEAM_NAME_MESSAGES = {
  looseJamo: '한글 자음·모음만 따로 쓸 수 없어요',
  emptyKey: '한글, 영문, 숫자를 한 글자 이상 넣어 주세요',
  registered: '등록된 팀',
  newTeam: '새 팀으로 예약돼요',
} as const;

/**
 * 서버 응답과 입력값으로 표시 상태를 정해요. 이름이 같은지·비슷한지는 판단하지 않고,
 * 응답(`problem`, `exact`, `matches`)만 써요. "입력 표기와 같은지"는 문자열이 그대로 같은지만 봐요.
 * 응답이 지금 입력값에 대한 것이 아니면(입력을 바꾼 직후 등) 응답이 없는 것으로 봐요.
 */
export function getTeamNameHint(search: TeamNameSearch | null, input: string): TeamNameHint {
  const none: TeamNameHint = {
    message: null,
    isError: false,
    blocked: false,
    submitName: input,
    items: [],
    showNewTeam: false,
  };

  if (!input || !search || search.query !== input) return none;

  const { problem, exact, matches } = search.response;

  if (problem) {
    return {
      ...none,
      message: problem === 'LOOSE_JAMO' ? TEAM_NAME_MESSAGES.looseJamo : TEAM_NAME_MESSAGES.emptyKey,
      isError: true,
      blocked: true,
    };
  }

  if (exact) {
    return {
      ...none,
      message: exact.name === input ? TEAM_NAME_MESSAGES.registered : `${exact.name} 팀으로 예약돼요`,
      submitName: exact.name,
    };
  }

  return {
    ...none,
    message: TEAM_NAME_MESSAGES.newTeam,
    items: matches,
    showNewTeam: matches.length > 0,
  };
}
