import { useCallback } from 'react';
import { reservationService, CreateInstantReservationDto, CreatePreReservationDto } from '../services';
import { useAsync } from './useAsync';

export function useReservation() {
    const {
        data: reservationData,
        loading,
        error,
        execute: fetchReservations,
        setData: setReservationData
    } = useAsync(reservationService.getReservations);

    const { execute: createInstant } = useAsync(reservationService.createInstant);
    const { execute: createPre } = useAsync(reservationService.createPre);
    const { execute: cancelRes } = useAsync(reservationService.cancel);

    const {
        data: myReservations,
        loading: myResLoading,
        execute: fetchMyReservations
    } = useAsync(reservationService.getMyReservations);

    const getReservations = useCallback((weekId?: string) => {
        return fetchReservations(weekId);
    }, [fetchReservations]);

    const getMyReservations = useCallback(() => {
        return fetchMyReservations();
    }, [fetchMyReservations]);

    const createInstantReservation = async (data: CreateInstantReservationDto) => {
        const newRes = await createInstant(data);
        // 예약 생성 후 목록 갱신 (또는 로컬 상태 업데이트)
        if (reservationData) {
            setReservationData({
                ...reservationData,
                reservations: [...reservationData.reservations, newRes]
            });
        }
        return newRes;
    };

    const createPreReservation = async (data: CreatePreReservationDto) => {
        const newRes = await createPre(data);
        return newRes;
    };

    const cancelReservation = async (id: string) => {
        await cancelRes(id);
        // 예약 취소 후 목록에서 제거 (전체 목록)
        if (reservationData) {
            setReservationData({
                ...reservationData,
                reservations: reservationData.reservations.filter(r => r.id !== id)
            });
        }
        // 내 예약 목록에서도 제거 (필요 시)
        if (myReservations) {
            // myReservations 업데이트 로직은 useAsync 구조상 setData를 노출 안 했으면 fetchMyReservations 다시 호출이 나음
            // 하지만 여기선 fetchMyReservations를 다시 호출하는 게 간단함
            fetchMyReservations();
        }
    };

    return {
        reservations: reservationData?.reservations || [],
        week: reservationData?.week || null,
        myReservations: myReservations || [],
        loading: loading || myResLoading,
        error,
        getReservations,
        getMyReservations,
        createInstantReservation,
        createPreReservation,
        cancelReservation,
    };
}
