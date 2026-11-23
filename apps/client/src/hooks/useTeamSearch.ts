import { useEffect, useState } from 'react';
import { teamService } from '@/services/team.service';
import type { TeamNameSearch } from '@/utils/teamNameHint';

const DEBOUNCE_MS = 250;

/**
 * 입력이 멈추고 250ms 뒤 `GET /teams/search`를 불러요.
 * 입력이 바뀌면 앞 요청의 응답은 버리고, 실패하면 아무것도 표시하지 않아요.
 * 돌려주는 값에는 어떤 입력에 대한 응답인지(`query`)가 들어 있어서,
 * 지금 입력값과 같은지는 `getTeamNameHint`가 확인해요.
 */
export function useTeamSearch(input: string): TeamNameSearch | null {
  const [search, setSearch] = useState<TeamNameSearch | null>(null);

  useEffect(() => {
    if (!input) return;

    let discarded = false;
    const timer = setTimeout(() => {
      teamService
        .search(input)
        .then((response) => {
          if (!discarded) setSearch({ query: input, response });
        })
        .catch(() => {
          // 검색이 실패해도 제출은 막지 않아요 (서버가 최종 판정)
        });
    }, DEBOUNCE_MS);

    return () => {
      discarded = true;
      clearTimeout(timer);
    };
  }, [input]);

  return search;
}
