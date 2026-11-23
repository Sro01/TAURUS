/**
 * 열지도 계산 (스펙 5.3) — 칸마다 가능 인원 / 전체 참여자.
 */
import type { HeatLevel, JamParticipant, SlotGrid, SlotRef } from '../../types/jam';
import { SLOT_COUNT, isSlotOn } from './slots';

/** [dayIndex][hourIndex] 가능 인원 격자. days = 기간 일수 */
export function countGrid(participants: JamParticipant[], days: number): SlotGrid<number> {
    const grid: SlotGrid<number> = Array.from({ length: days }, () => new Array<number>(SLOT_COUNT).fill(0));
    for (const person of participants) {
        for (let d = 0; d < days; d++) {
            const mask = person.slots[d] ?? 0;
            for (let h = 0; h < SLOT_COUNT; h++) {
                if (isSlotOn(mask, h)) grid[d][h]++;
            }
        }
    }
    return grid;
}

/** 그 칸에 되는 참여자 (participants 순서 유지). 칸 상세 시트의 "됨 · 이름" */
export function availableAt(participants: JamParticipant[], ref: SlotRef): JamParticipant[] {
    return participants.filter((p) => isSlotOn(p.slots[ref.dayIndex] ?? 0, ref.hourIndex));
}

/**
 * 색 단계: count 0 또는 total 0 → 0, count === total → 4,
 * count/total ≤ 0.34 → 1, ≤ 0.67 → 2, 그 이상 → 3 (시안 heat()와 같은 경계)
 */
export function heatLevel(count: number, total: number): HeatLevel {
    if (count <= 0 || total <= 0) return 0;
    if (count >= total) return 4;
    const ratio = count / total;
    if (ratio <= 0.34) return 1;
    if (ratio <= 0.67) return 2;
    return 3;
}
