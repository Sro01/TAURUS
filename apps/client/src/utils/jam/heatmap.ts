/**
 * 열지도 계산 (스펙 5.3) — 칸마다 가능 인원 / 전체 참여자.
 * 본문은 utils/jam 담당이 채운다 (지금은 시그니처만).
 */
import type { HeatLevel, JamParticipant, SlotGrid, SlotRef } from '../../types/jam';

const notImplemented = (): never => {
    throw new Error('not implemented');
};

/** [dayIndex][hourIndex] 가능 인원 격자. days = 기간 일수 */
export function countGrid(participants: JamParticipant[], days: number): SlotGrid<number> {
    void participants; void days;
    return notImplemented();
}

/** 그 칸에 되는 참여자 (participants 순서 유지). 칸 상세 시트의 "됨 · 이름" */
export function availableAt(participants: JamParticipant[], ref: SlotRef): JamParticipant[] {
    void participants; void ref;
    return notImplemented();
}

/**
 * 색 단계: count 0 또는 total 0 → 0, count === total → 4,
 * count/total ≤ 0.34 → 1, ≤ 0.67 → 2, 그 이상 → 3 (시안 heat()와 같은 경계)
 */
export function heatLevel(count: number, total: number): HeatLevel {
    void count; void total;
    return notImplemented();
}
