import { useEffect } from 'react';
import { weekService } from '../services';
import { Week } from '../types/week';
import { useAsync } from './useAsync';

export function useWeek() {
    const { data: currentWeek, loading, error, execute: fetchCurrentWeek } = useAsync<Week, []>(
        weekService.getCurrentWeek
    );

    const { data: allWeeks, execute: fetchAllWeeks } = useAsync<Week[], []>(
        weekService.getWeeks
    );

    useEffect(() => {
        fetchCurrentWeek();
        fetchAllWeeks(); // 전체 주차 목록도 로드
    }, [fetchCurrentWeek, fetchAllWeeks]);

    // 다음 주차 찾기 (현재 주차 번호 + 1)
    const nextWeek = currentWeek && Array.isArray(allWeeks)
        ? allWeeks.find(w => w.weekNumber === currentWeek.weekNumber + 1) || null
        : null;

    return {
        currentWeek,
        nextWeek,
        allWeeks,
        loading,
        error,
        refreshCurrentWeek: fetchCurrentWeek,
        refreshAllWeeks: fetchAllWeeks,
    };
}
