import { useCallback } from 'react';
import { reservationService } from '../services';
import { CreateInstantReservationDto, CreatePreReservationDto } from '../types/reservation';
import { useAsync } from './useAsync';

export function useReservation() {
    // ReservationListResponse = { confirmed: [], pending: [] }
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
        // 예약 생성 후 목록 갱신 (confirmed에 추가)
        if (reservationData) {
            setReservationData({
                ...reservationData,
                confirmed: [...reservationData.confirmed, newRes]
            });
        }
        return newRes;
    };

    const createPreReservation = async (data: CreatePreReservationDto) => {
        const newRes = await createPre(data);
        // 예약 생성 후 목록 갱신 (pending에 추가)
        if (reservationData) {
            setReservationData({
                ...reservationData,
                pending: [...reservationData.pending, newRes]
            });
        }
        return newRes;
    };

    const cancelReservation = async (id: string) => {
        await cancelRes(id);
        // 예약 취소 후 목록에서 제거 (confirmed/pending 양쪽 다 필터링)
        if (reservationData) {
            setReservationData({
                confirmed: reservationData.confirmed.filter(r => r.id !== id),
                pending: reservationData.pending.filter(r => r.id !== id),
            });
        }
        if (myReservations) {
            fetchMyReservations();
        }
    };

    // 호환성을 위해 flat list로 제공
    const allReservations = [
        ...(reservationData?.confirmed || []),
        ...(reservationData?.pending || [])
    ];

    return {
        reservations: allReservations, // 기존 코드 호환
        confirmed: reservationData?.confirmed || [],
        pending: reservationData?.pending || [],
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

