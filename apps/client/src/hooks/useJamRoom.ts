import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks';
import { useReservationAction } from '@/hooks/useReservationAction';
import { reservationService } from '@/services/reservation.service';
import { jamService } from '@/services/jam.service';
import {
    JAM_TOKEN_EXPIRED_EVENT,
    clearJamToken,
    getJamErrorMessage,
    getJamErrorStatus,
    getJamToken,
    setJamToken,
    type JamTokenExpiredDetail,
} from '@/services/jamApi';
import type { Reservation } from '@/types/reservation';
import type {
    EnterJamRoomResult,
    JamParticipant,
    JamRoom,
    ReservationKind,
    SaveJamSlotsInput,
    SlotRef,
    UpdateJamRoomInput,
} from '@/types/jam';
import type { MainWeeksResponse } from '@/types/week';
import dayjs from '@/utils/dayjs';
import { JAM_TIMEZONE, dayDate, indexToHour, reservationKindOf, slotStartIso } from '@/utils/jam/slots';

export type JamRoomStatus = 'loading' | 'ready' | 'notFound' | 'error';

/** 화면에 돌아왔을 때 다시 받는 최소 간격 (focus와 visibilitychange가 같이 오는 경우 한 번만) */
const RETURN_REFRESH_GAP_MS = 3000;
/** "지난 칸" 판단 시각을 갱신하는 간격 */
const NOW_TICK_MS = 60_000;

/** 방 출입증(JWT)의 sub = 참여자 id. 읽지 못하면 null */
function participantIdFromToken(token: string | null): string | null {
    if (!token) return null;
    try {
        const payload = token.split('.')[1];
        const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const sub = (JSON.parse(json) as { sub?: unknown }).sub;
        return typeof sub === 'string' ? sub : null;
    } catch {
        return null;
    }
}

/**
 * 방 데이터 (스펙 5.2): 방 불러오기, 저장, 다시 받아오기, 출입증 보관, 주차 상태·예약 현황.
 * 방 API는 jamService(=jamApi)만 쓴다. 예약 현황·주차는 공개 API라 기존 서비스 함수를 쓴다.
 * 다시 받아오는 때: 처음, 화면에 돌아올 때(focus·visibilitychange), 내 시간을 저장했을 때, 예약을 마쳤을 때(useJamBooking).
 */
export function useJamRoom(slug: string) {
    const [room, setRoom] = useState<JamRoom | null>(null);
    const [status, setStatus] = useState<JamRoomStatus>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [weeks, setWeeks] = useState<MainWeeksResponse | null>(null);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [now, setNow] = useState(() => dayjs());
    const [token, setToken] = useState<string | null>(() => getJamToken(slug));
    const [myId, setMyId] = useState<string | null>(() => participantIdFromToken(getJamToken(slug)));
    const [entering, setEntering] = useState(false);
    const [enterError, setEnterError] = useState<string | null>(null);

    // 오래된 응답이 새 응답을 덮어쓰지 않게 요청 순번을 센다
    const roomSeq = useRef(0);
    const lastRefreshAt = useRef(0);

    /** 방 + 참여자 받기. 성공하면 true. 이미 받은 방이 있으면 실패해도 화면을 그대로 둔다 */
    const loadRoom = useCallback(async (): Promise<boolean> => {
        const seq = ++roomSeq.current;
        try {
            const next = await jamService.getRoom(slug);
            if (seq !== roomSeq.current) return true;
            setRoom(next);
            setStatus('ready');
            setErrorMessage(null);
            return true;
        } catch (error) {
            if (seq !== roomSeq.current) return false;
            if (getJamErrorStatus(error) === 404) {
                setStatus('notFound');
            } else {
                setStatus((prev) => (prev === 'ready' ? prev : 'error'));
                setErrorMessage(getJamErrorMessage(error, '방을 불러오지 못했어요'));
            }
            return false;
        }
    }, [slug]);

    /** 서버 주차 상태(OPEN·UPCOMING)를 다시 받는다. 실패하면 null (이전 값은 그대로) */
    const refreshWeeks = useCallback(async (): Promise<MainWeeksResponse | null> => {
        try {
            const next = await jamService.getMainWeeks();
            setWeeks(next);
            return next;
        } catch {
            return null;
        }
    }, []);

    /** 이번 주·다음 주 예약 현황(마감·대기). 실패하면 이전 값을 둔다 */
    const refreshReservations = useCallback(async () => {
        try {
            const [current, next] = await Promise.all([
                reservationService.getReservations('current'),
                reservationService.getReservations('next'),
            ]);
            setReservations([...current.confirmed, ...current.pending, ...next.confirmed, ...next.pending]);
        } catch {
            // 이전 예약 현황을 그대로 보여 준다
        }
    }, []);

    /** 방 · 주차 · 예약 현황 한꺼번에 */
    const refresh = useCallback(async () => {
        lastRefreshAt.current = Date.now();
        await Promise.all([loadRoom(), refreshWeeks(), refreshReservations()]);
        setNow(dayjs());
    }, [loadRoom, refreshWeeks, refreshReservations]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    // 화면에 돌아올 때
    useEffect(() => {
        const onReturn = () => {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - lastRefreshAt.current < RETURN_REFRESH_GAP_MS) return;
            void refresh();
        };
        window.addEventListener('focus', onReturn);
        document.addEventListener('visibilitychange', onReturn);
        return () => {
            window.removeEventListener('focus', onReturn);
            document.removeEventListener('visibilitychange', onReturn);
        };
    }, [refresh]);

    // 지난 칸 판단 시각
    useEffect(() => {
        const id = window.setInterval(() => setNow(dayjs()), NOW_TICK_MS);
        return () => window.clearInterval(id);
    }, []);

    // 출입증이 만료·무효라 jamApi가 지웠을 때
    useEffect(() => {
        const onExpired = (event: Event) => {
            if ((event as CustomEvent<JamTokenExpiredDetail>).detail?.slug !== slug) return;
            setToken(null);
            setMyId(null);
        };
        window.addEventListener(JAM_TOKEN_EXPIRED_EVENT, onExpired);
        return () => window.removeEventListener(JAM_TOKEN_EXPIRED_EVENT, onExpired);
    }, [slug]);

    const me: JamParticipant | null = useMemo(
        () => (token && myId && room ? (room.participants.find((p) => p.id === myId) ?? null) : null),
        [token, myId, room],
    );

    /** 이름 + 비밀번호로 들어오기. 성공하면 true, 실패 문구는 enterError */
    const enter = useCallback(
        async (name: string, pin: string): Promise<boolean> => {
            setEntering(true);
            setEnterError(null);
            try {
                const result: EnterJamRoomResult = await jamService.enter(slug, { name, pin });
                setJamToken(slug, result.token);
                setToken(result.token);
                setMyId(result.participant.id);
                const loaded = await loadRoom();
                if (!loaded) {
                    // 방을 다시 받지 못해도 방금 들어온 내 자리는 보여 준다
                    setRoom((prev) =>
                        prev && !prev.participants.some((p) => p.id === result.participant.id)
                            ? { ...prev, participants: [...prev.participants, result.participant] }
                            : prev,
                    );
                }
                return true;
            } catch (error) {
                setEnterError(getJamErrorMessage(error, '들어오지 못했어요. 다시 눌러 주세요'));
                return false;
            } finally {
                setEntering(false);
            }
        },
        [slug, loadRoom],
    );

    const clearEnterError = useCallback(() => setEnterError(null), []);

    /** 내 가능 칸 통째로 저장 → 다시 받아오기. 실패하면 던진다 */
    const saveMySlots = useCallback(
        async (input: SaveJamSlotsInput) => {
            await jamService.saveMySlots(slug, input);
            await refresh();
        },
        [slug, refresh],
    );

    /** 제목·인원 바꾸기 → 다시 받아오기. 서버가 거절하면 던진다 */
    const updateRoom = useCallback(
        async (input: UpdateJamRoomInput) => {
            await jamService.updateRoom(slug, input);
            await loadRoom();
        },
        [slug, loadRoom],
    );

    /** 빠지기 → 출입증 삭제 → 다시 받아오기. 실패하면 던진다 */
    const leave = useCallback(async () => {
        await jamService.leave(slug);
        clearJamToken(slug);
        setToken(null);
        setMyId(null);
        await loadRoom();
    }, [slug, loadRoom]);

    return {
        room,
        status,
        errorMessage,
        weeks,
        reservations,
        now,
        me,
        entering,
        enterError,
        clearEnterError,
        enter,
        saveMySlots,
        updateRoom,
        leave,
        refresh,
        refreshWeeks,
        refreshReservations,
    };
}

export type JamRoomState = ReturnType<typeof useJamRoom>;

/**
 * 예약 연결 (스펙 5.4 흐름 1~5). 기존 useReservationAction + ReservationModal을 그대로 쓴다.
 * 주차 상태를 다시 받아 OPEN이면 바로 예약, UPCOMING이면 미리 예약, 둘 다 아니면 예약하지 않는다.
 * 돌려주는 modalProps를 <ReservationModal {...modalProps} />에 그대로 넘긴다.
 */
export function useJamBooking(jam: JamRoomState, notify: (message: string) => void) {
    const { room, weeks, reservations, refresh, refreshWeeks, refreshReservations } = jam;
    const { teamName, teamPassword } = useAuth();
    const [target, setTarget] = useState<SlotRef | null>(null);
    const starting = useRef(false);

    const date = room && target ? dayDate(room.startDate, target.dayIndex) : null;
    // 종류는 항상 서버 주차 상태로 정한다 (다시 받으면 모달 문구도 바뀐 대로)
    const kind: ReservationKind = date && weeks ? reservationKindOf(date, weeks) : 'none';

    const { isAuthModalOpen, initiateReservation, handleAuthSubmit, closeModal } = useReservationAction({
        type: kind === 'pre' ? 'PRE' : 'INSTANT',
        onSuccess: () => {
            void refresh();
        },
        onError: (error) => {
            notify(getJamErrorMessage(error, '예약하지 못했어요'));
            void refreshWeeks();
            void refreshReservations();
        },
    });

    // 모달이 열려 있는 동안 주차가 바뀌어 예약할 수 없는 시간이 되면 닫는다
    useEffect(() => {
        if (isAuthModalOpen && target && weeks && kind === 'none') {
            closeModal();
            setTarget(null);
            notify('예약할 수 없는 시간이에요');
        }
    }, [isAuthModalOpen, target, weeks, kind, closeModal, notify]);

    /** 카드·칸 상세에서 칸을 골랐을 때 */
    const start = useCallback(
        async (ref: SlotRef) => {
            if (!room || starting.current) return;
            starting.current = true;
            try {
                const fresh = await refreshWeeks();
                if (!fresh) {
                    notify('주차 정보를 불러오지 못했어요. 다시 눌러 주세요');
                    return;
                }
                if (reservationKindOf(dayDate(room.startDate, ref.dayIndex), fresh) === 'none') {
                    notify('예약할 수 없는 시간이에요');
                    return;
                }
                setTarget(ref);
                initiateReservation(slotStartIso(room.startDate, ref));
            } finally {
                starting.current = false;
            }
        },
        [room, refreshWeeks, notify, initiateReservation],
    );

    // 모달에 넘기는 목록은 그 날짜 예약만 (모달은 HH:mm만 비교한다)
    const dayReservations = useMemo(
        () =>
            date
                ? reservations.filter(
                      (r) => dayjs(r.startTime).tz(JAM_TIMEZONE).format('YYYY-MM-DD') === date,
                  )
                : [],
        [reservations, date],
    );

    const verb = kind === 'pre' ? '미리 예약' : '바로 예약';
    const hourText = target ? `${String(indexToHour(target.hourIndex)).padStart(2, '0')}:00` : '';
    const dateText = date ? dayjs.utc(date).format('M월 D일 (ddd)') : '';

    const modalProps = {
        isOpen: isAuthModalOpen && target !== null && kind !== 'none',
        onClose: () => {
            closeModal();
            setTarget(null);
        },
        selectedTime: hourText,
        selectedDate: date ?? '',
        existingReservations: dayReservations,
        onSubmit: handleAuthSubmit,
        teamName,
        teamPassword,
        showWaitlist: kind === 'pre',
        title: `${dateText} ${verb}`,
        submitLabel: `${hourText} ${verb}하기`,
    };

    return { start, modalProps };
}
