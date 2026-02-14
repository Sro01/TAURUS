import { useState, useEffect, useCallback } from 'react';
import dayjs from '../../../../utils/dayjs';
import { useWeek, useReservation } from '../../../../hooks';
import { Week } from '../../../../types/week';

interface UseReservationPageProps {
    weekType: 'current' | 'next';
}

export function useReservationPage({ weekType }: UseReservationPageProps) {
    // 상태
    const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

    // 훅
    const { currentWeek, nextWeek, loading: weekLoading } = useWeek();
    const {
        reservations,
        loading: resLoading,
        getReservations
    } = useReservation();

    // weekType에 따른 타겟 주차 결정
    const targetWeek: Week | null = weekType === 'current' ? currentWeek : nextWeek;

    // 주차 정보 로드 시 초기 데이터 설정
    useEffect(() => {
        if (targetWeek && targetWeek.weekNumber !== undefined) {
            // 해당 주차 예약 정보 로드
            getReservations(targetWeek.weekNumber.toString());

            // 날짜가 아직 선택되지 않았거나, 선택된 날짜가 해당 주차 범위 밖이라면 초기화
            // (기본값: 주차 시작일 or 오늘)
            if (!selectedDate ||
                selectedDate.isBefore(dayjs(targetWeek.startDate)) ||
                selectedDate.isAfter(dayjs(targetWeek.endDate))) {

                // nextWeek인 경우 시작일, currentWeek인 경우 오늘(범위 내라면) 또는 시작일
                const today = dayjs();
                const start = dayjs(targetWeek.startDate);
                const end = dayjs(targetWeek.endDate);

                if (weekType === 'current' && today.isAfter(start) && today.isBefore(end)) {
                    setSelectedDate(today);
                } else {
                    setSelectedDate(start);
                }
            }
        }
    }, [weekType, targetWeek, getReservations]);

    // 날짜 변경 핸들러
    const handleDateSelect = useCallback((date: dayjs.Dayjs) => {
        setSelectedDate(date);
    }, []);

    // 선택된 날짜의 예약 목록 필터링
    const dailyReservations = reservations.filter(res =>
        selectedDate && dayjs(res.startTime).format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD')
    );

    return {
        weekData: targetWeek,
        loading: weekLoading || resLoading,
        reservations: dailyReservations, // 해당 날짜의 예약만 반환
        allReservations: reservations,   // 전체 예약 반환 (필요 시)
        selectedDate: selectedDate || dayjs(),
        handleDateSelect,
        refreshReservations: () => targetWeek && getReservations(targetWeek.weekNumber.toString())
    };
}
