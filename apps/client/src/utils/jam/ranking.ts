/**
 * 우선순위 카드 (스펙 5.3) — 이어지는 시간 묶기, 정렬 3종, 꼭 와야 하는 사람 거르기, 대기 적은 칸 고르기.
 */
import type { CellBlock, JamParticipant, PriorityCard, SlotGrid, SortKey } from '../../types/jam';
import { SLOT_COUNT, isSlotOn } from './slots';

/** 최대 카드 수 (정렬 뒤 자름) */
export const MAX_PRIORITY_CARDS = 8;

/** 그 칸에 되는 참여자 id (participants 순서). 막힌 칸은 빈 배열 */
function openIdsAt(
    participants: JamParticipant[],
    blocked: SlotGrid<CellBlock>,
    dayIndex: number,
    hourIndex: number,
): string[] {
    if (blocked[dayIndex][hourIndex] !== null) return [];
    return participants
        .filter((p) => isSlotOn(p.slots[dayIndex] ?? 0, hourIndex))
        .map((p) => p.id);
}

/** 정렬 기준 (스펙 5.3). 같은 (날, 시작 시각)인 카드는 없으므로 완전 동점이 없다 */
const comparators: Record<SortKey, (a: PriorityCard, b: PriorityCard) => number> = {
    people: (a, b) => b.participantIds.length - a.participantIds.length || byTime(a, b),
    time: (a, b) => byTime(a, b),
    length: (a, b) =>
        b.length - a.length || b.participantIds.length - a.participantIds.length || byTime(a, b),
};

function byTime(a: PriorityCard, b: PriorityCard): number {
    return a.dayIndex - b.dayIndex || a.startHourIndex - b.startHourIndex;
}

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
    const cards: PriorityCard[] = [];

    for (let d = 0; d < blocked.length; d++) {
        let current: { start: number; ids: string[]; signature: string; recommended: number } | null = null;

        const close = (end: number) => {
            if (!current) return;
            cards.push({
                dayIndex: d,
                startHourIndex: current.start,
                length: end - current.start,
                participantIds: current.ids,
                recommendedHourIndex: current.recommended,
            });
            current = null;
        };

        for (let h = 0; h < SLOT_COUNT; h++) {
            const ids = openIdsAt(participants, blocked, d, h);
            const good = ids.length > 0 && required.every((id) => ids.includes(id));
            const signature = ids.join(',');
            const waiting = pending[d]?.[h] ?? 0;

            if (good && current && current.signature === signature) {
                // 이어지는 같은 사람들 구간. 대기가 더 적을 때만 추천을 옮겨 같으면 이른 칸이 남는다
                if (waiting < (pending[d]?.[current.recommended] ?? 0)) current.recommended = h;
                continue;
            }
            close(h);
            if (good) current = { start: h, ids, signature, recommended: h };
        }
        close(SLOT_COUNT);
    }

    return cards.sort(comparators[sort]).slice(0, MAX_PRIORITY_CARDS);
}
