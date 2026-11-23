import { describe, it, expect } from 'vitest';
import { MAX_PRIORITY_CARDS, buildPriorityCards } from './ranking';
import { SLOT_COUNT } from './slots';
import type { CellBlock, JamParticipant, SlotGrid } from '../../types/jam';

/** 시간 인덱스 목록 → 하루 값 */
const mask = (...hours: number[]) => hours.reduce((m, h) => m | (1 << h), 0);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const person = (id: string, ...days: number[][]): JamParticipant => ({
    id,
    name: id,
    slots: days.map((hs) => mask(...hs)),
});
const open = (days: number): SlotGrid<CellBlock> =>
    Array.from({ length: days }, () => new Array<CellBlock>(SLOT_COUNT).fill(null));
const zeros = (days: number): SlotGrid<number> =>
    Array.from({ length: days }, () => new Array<number>(SLOT_COUNT).fill(0));

describe('묶기 경계', () => {
    it('같은 사람들이 이어지면 한 카드', () => {
        const ps = [person('a', range(2, 5)), person('b', range(2, 5))];
        const cards = buildPriorityCards(ps, open(1), zeros(1), [], 'people');
        expect(cards).toEqual([
            { dayIndex: 0, startHourIndex: 2, length: 4, participantIds: ['a', 'b'], recommendedHourIndex: 2 },
        ]);
    });

    it('사람이 바뀌는 시각에서 끊김', () => {
        // a: 2~5, b: 4~7 → [2,3]=a, [4,5]=a+b, [6,7]=b
        const ps = [person('a', range(2, 5)), person('b', range(4, 7))];
        const cards = buildPriorityCards(ps, open(1), zeros(1), [], 'time');
        expect(cards.map((c) => [c.startHourIndex, c.length, c.participantIds])).toEqual([
            [2, 2, ['a']],
            [4, 2, ['a', 'b']],
            [6, 2, ['b']],
        ]);
    });

    it('사람 수가 같아도 집합이 다르면 끊김', () => {
        const ps = [person('a', [1, 2]), person('b', [2, 3])];
        // h1: a, h2: a+b, h3: b
        const cards = buildPriorityCards(ps, open(1), zeros(1), [], 'time');
        expect(cards.map((c) => c.participantIds)).toEqual([['a'], ['a', 'b'], ['b']]);
        const swapped = buildPriorityCards([person('a', [1]), person('b', [2])], open(1), zeros(1), [], 'time');
        expect(swapped.map((c) => c.participantIds)).toEqual([['a'], ['b']]);
    });

    it('빈 칸이 사이에 있으면 끊김', () => {
        const ps = [person('a', [2, 3, 5, 6])];
        const cards = buildPriorityCards(ps, open(1), zeros(1), [], 'time');
        expect(cards.map((c) => [c.startHourIndex, c.length])).toEqual([[2, 2], [5, 2]]);
    });

    it('날이 바뀌면 끊김 (13번 칸 -> 다음 날 0번 칸)', () => {
        const ps = [person('a', [12, 13], [0, 1])];
        const cards = buildPriorityCards(ps, open(2), zeros(2), [], 'time');
        expect(cards.map((c) => [c.dayIndex, c.startHourIndex, c.length])).toEqual([
            [0, 12, 2],
            [1, 0, 2],
        ]);
    });

    it('하루 전체(14칸)도 한 카드', () => {
        const ps = [person('a', range(0, 13))];
        const cards = buildPriorityCards(ps, open(1), zeros(1), [], 'time');
        expect(cards).toHaveLength(1);
        expect(cards[0].length).toBe(14);
    });

    it('아무도 안 되면 카드 없음, 참여자 없어도 빈 배열', () => {
        expect(buildPriorityCards([person('a', [])], open(1), zeros(1), [], 'people')).toEqual([]);
        expect(buildPriorityCards([], open(2), zeros(2), [], 'people')).toEqual([]);
    });
});

describe('막힌 칸 제외', () => {
    it('막힌 칸은 후보가 아니고 구간을 끊는다', () => {
        const ps = [person('a', range(2, 6))];
        const blocked = open(1);
        blocked[0][4] = 'booked';
        const cards = buildPriorityCards(ps, blocked, zeros(1), [], 'time');
        expect(cards.map((c) => [c.startHourIndex, c.length])).toEqual([[2, 2], [5, 2]]);
    });

    it('past도 제외', () => {
        const ps = [person('a', range(0, 3))];
        const blocked = open(1);
        blocked[0][0] = 'past';
        blocked[0][1] = 'past';
        const cards = buildPriorityCards(ps, blocked, zeros(1), [], 'time');
        expect(cards.map((c) => [c.startHourIndex, c.length])).toEqual([[2, 2]]);
    });
});

describe('꼭 와야 하는 사람', () => {
    const ps = [person('a', range(2, 5)), person('b', range(4, 7)), person('c', [4])];

    it('모두 있는 칸만 남긴다', () => {
        const cards = buildPriorityCards(ps, open(1), zeros(1), ['b'], 'time');
        expect(cards.map((c) => [c.startHourIndex, c.length, c.participantIds])).toEqual([
            [4, 1, ['a', 'b', 'c']],
            [5, 1, ['a', 'b']],
            [6, 2, ['b']],
        ]);
    });

    it('둘 이상 요구하면 교집합 칸만', () => {
        const cards = buildPriorityCards(ps, open(1), zeros(1), ['a', 'b'], 'time');
        expect(cards.map((c) => [c.startHourIndex, c.length, c.participantIds])).toEqual([
            [4, 1, ['a', 'b', 'c']],
            [5, 1, ['a', 'b']],
        ]);
    });

    it('없는 사람을 요구하면 카드 없음', () => {
        expect(buildPriorityCards(ps, open(1), zeros(1), ['zzz'], 'time')).toEqual([]);
    });
});

describe('정렬 3종과 동점 규칙', () => {
    // 하루 0: a 0~1 (a), 하루 1: a+b 3 (1칸), 하루 2: a 5~7 (3칸), 하루 3: b 0~1 (2칸)
    const ps = [
        person('a', [0, 1], [3], [5, 6, 7], []),
        person('b', [], [3], [], [0, 1]),
    ];
    const run = (sort: 'people' | 'time' | 'length') =>
        buildPriorityCards(ps, open(4), zeros(4), [], sort).map((c) => [c.dayIndex, c.startHourIndex]);

    it('people: 인원 내림차순, 같으면 빠른 시간', () => {
        expect(run('people')).toEqual([
            [1, 3], // 2명
            [0, 0], // 1명, 가장 빠름
            [2, 5],
            [3, 0],
        ]);
    });

    it('time: 날짜·시간 오름차순', () => {
        expect(run('time')).toEqual([
            [0, 0],
            [1, 3],
            [2, 5],
            [3, 0],
        ]);
    });

    it('length: 길이 내림차순 -> 인원 내림차순 -> 빠른 시간', () => {
        expect(run('length')).toEqual([
            [2, 5], // 3칸
            [0, 0], // 2칸 1명, 빠름
            [3, 0], // 2칸 1명
            [1, 3], // 1칸
        ]);
        // 길이 같고 인원 다르면 인원 우선
        const ps2 = [person('a', [0, 1], [0, 1]), person('b', [], [0, 1])];
        const cards = buildPriorityCards(ps2, open(2), zeros(2), [], 'length');
        expect(cards.map((c) => [c.dayIndex, c.participantIds.length])).toEqual([
            [1, 2],
            [0, 1],
        ]);
    });
});

describe('최대 8장', () => {
    it('정렬 뒤 8장에서 자른다', () => {
        // 10일, 각 날 서로 다른 길이(1~10칸)
        const days = Array.from({ length: 10 }, (_, d) => range(0, d));
        const ps = [person('a', ...days)];
        const byLength = buildPriorityCards(ps, open(10), zeros(10), [], 'length');
        expect(MAX_PRIORITY_CARDS).toBe(8);
        expect(byLength).toHaveLength(8);
        expect(byLength.map((c) => c.length)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
        // 빠른 시간순도 앞 8일
        const byTime = buildPriorityCards(ps, open(10), zeros(10), [], 'time');
        expect(byTime.map((c) => c.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });
});

describe('추천 시간', () => {
    const ps = [person('a', range(2, 5))];

    it('대기 팀이 가장 적은 칸', () => {
        const pending = zeros(1);
        pending[0][2] = 3;
        pending[0][3] = 1;
        pending[0][4] = 0;
        pending[0][5] = 2;
        expect(buildPriorityCards(ps, open(1), pending, [], 'time')[0].recommendedHourIndex).toBe(4);
    });

    it('같으면 이른 칸', () => {
        const pending = zeros(1);
        pending[0][2] = 2;
        pending[0][3] = 1;
        pending[0][4] = 1;
        pending[0][5] = 1;
        expect(buildPriorityCards(ps, open(1), pending, [], 'time')[0].recommendedHourIndex).toBe(3);
        expect(buildPriorityCards(ps, open(1), zeros(1), [], 'time')[0].recommendedHourIndex).toBe(2);
    });

    it('구간 밖 칸의 대기는 보지 않는다', () => {
        const pending = zeros(1);
        pending[0][2] = 5;
        pending[0][3] = 4;
        pending[0][1] = 0;
        expect(buildPriorityCards([person('a', [2, 3])], open(1), pending, [], 'time')[0].recommendedHourIndex).toBe(3);
    });
});
