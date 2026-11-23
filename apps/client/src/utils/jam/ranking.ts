/**
 * 우선순위 카드 (스펙 5.3) — 이어지는 시간 묶기, 정렬 3종, 꼭 와야 하는 사람 거르기, 대기 적은 칸 고르기.
 * 본문은 utils/jam 담당이 채운다 (지금은 시그니처만).
 */
import type { CellBlock, JamParticipant, PriorityCard, SlotGrid, SortKey } from '../../types/jam';

/** 최대 카드 수 (정렬 뒤 자름) */
export const MAX_PRIORITY_CARDS = 8;

const notImplemented = (): never => {
    throw new Error('not implemented');
};

/**
 * 카드 만들기.
 * - 후보 칸: blocked가 null이고, 되는 사람이 1명 이상이고, required(참여자 id)가 모두 되는 칸
 * - 같은 날 이어지는 칸이면서 되는 사람 집합이 똑같으면 한 카드. 날이 바뀌면 끊김
 * - 정렬: 'people' 인원↓ → 빠른 시간↑ / 'time' 날짜·시간↑ / 'length' 길이↓ → 인원↓ → 빠른 시간↑
 * - 추천 칸: 구간 안에서 pending 값이 가장 작은 칸 (같으면 이른 칸)
 * - 최대 MAX_PRIORITY_CARDS장
 */
export function buildPriorityCards(
    participants: JamParticipant[],
    blocked: SlotGrid<CellBlock>,
    pending: SlotGrid<number>,
    required: string[],
    sort: SortKey,
): PriorityCard[] {
    void participants; void blocked; void pending; void required; void sort;
    return notImplemented();
}
