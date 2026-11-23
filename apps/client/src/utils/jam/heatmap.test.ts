import { describe, it, expect } from 'vitest';
import { availableAt, countGrid, heatLevel } from './heatmap';
import type { JamParticipant } from '../../types/jam';

const person = (id: string, slots: number[]): JamParticipant => ({ id, name: id, slots });

describe('countGrid', () => {
    it('칸마다 가능 인원 수', () => {
        const grid = countGrid([person('a', [0b011, 0]), person('b', [0b110, 1 << 13])], 2);
        expect(grid).toHaveLength(2);
        expect(grid[0]).toHaveLength(14);
        expect(grid[0].slice(0, 4)).toEqual([1, 2, 1, 0]);
        expect(grid[1][13]).toBe(1);
        expect(grid[1][0]).toBe(0);
    });

    it('참여자 없음 → 전부 0, slots가 짧아도 0으로 본다', () => {
        expect(countGrid([], 3).flat().every((n) => n === 0)).toBe(true);
        expect(countGrid([person('a', [1])], 2)[1][0]).toBe(0);
    });
});

describe('availableAt', () => {
    it('되는 사람만, participants 순서 유지', () => {
        const ps = [person('a', [0b10]), person('b', [0b01]), person('c', [0b11])];
        expect(availableAt(ps, { dayIndex: 0, hourIndex: 0 }).map((p) => p.id)).toEqual(['b', 'c']);
        expect(availableAt(ps, { dayIndex: 0, hourIndex: 1 }).map((p) => p.id)).toEqual(['a', 'c']);
        expect(availableAt(ps, { dayIndex: 0, hourIndex: 2 })).toEqual([]);
        expect(availableAt(ps, { dayIndex: 5, hourIndex: 0 })).toEqual([]);
    });
});

describe('heatLevel', () => {
    it('0명 또는 전체 0 → 0', () => {
        expect(heatLevel(0, 5)).toBe(0);
        expect(heatLevel(0, 0)).toBe(0);
        expect(heatLevel(3, 0)).toBe(0);
    });

    it('전원 → 4', () => {
        expect(heatLevel(5, 5)).toBe(4);
        expect(heatLevel(1, 1)).toBe(4);
    });

    it('경계 0.34 / 0.67', () => {
        expect(heatLevel(1, 3)).toBe(1); // 0.333
        expect(heatLevel(1, 10)).toBe(1);
        expect(heatLevel(34, 100)).toBe(1); // 0.34 포함
        expect(heatLevel(35, 100)).toBe(2);
        expect(heatLevel(2, 3)).toBe(2); // 0.667
        expect(heatLevel(67, 100)).toBe(2); // 0.67 포함
        expect(heatLevel(68, 100)).toBe(3);
        expect(heatLevel(3, 4)).toBe(3);
        expect(heatLevel(4, 5)).toBe(3);
    });
});
