/**
 * 합주 시간 맞추기 (jam) 타입
 * 서버 API 모양은 스펙 4.4를 따른다. 날짜는 모두 KST 'YYYY-MM-DD' 문자열.
 */

/** 방 만들 때 기간: 이번 주 / 다음 주 / 이번 주 + 다음 주 */
export type JamRange = 'this' | 'next' | 'both';

export interface JamParticipant {
    id: string;
    name: string;
    /** 날짜마다 14비트 정수. slots[i] = startDate + i일, 비트 0 = 09시, 비트 13 = 22시 */
    slots: number[];
}

export interface JamRoom {
    slug: string;
    title: string;
    /** null = 아직 몰라요 */
    headcount: number | null;
    /** 기간 첫날 'YYYY-MM-DD' (KST) */
    startDate: string;
    /** 기간 마지막 날 'YYYY-MM-DD' (KST) */
    endDate: string;
    /** 오늘(KST) > endDate 이면 true. 보기만 가능 */
    ended: boolean;
    participants: JamParticipant[];
}

/** 날짜 계산에 필요한 방 기간만 */
export type JamDateRange = Pick<JamRoom, 'startDate' | 'endDate'>;

// ===== 요청·응답 =====

/** POST /jam-rooms */
export interface CreateJamRoomInput {
    title: string;
    headcount: number | null;
    range: JamRange;
}

export interface CreateJamRoomResult {
    slug: string;
}

/** PATCH /jam-rooms/:slug — 키가 없으면 안 바꿈, headcount: null = 아직 몰라요 */
export interface UpdateJamRoomInput {
    title?: string;
    headcount?: number | null;
}

/** POST /jam-rooms/:slug/participants */
export interface EnterJamRoomInput {
    name: string;
    /** 숫자 4자리 */
    pin: string;
}

export interface EnterJamRoomResult {
    token: string;
    participant: JamParticipant;
}

/** PUT /jam-rooms/:slug/participants/me/slots — 길이 = 기간 일수, 각 값 0 ≤ v < 16384 */
export interface SaveJamSlotsInput {
    slots: number[];
}

// ===== 화면 계산 (utils/jam) =====

/** 칸 하나: 기간 안의 날짜 인덱스 + 시간 인덱스(0 = 09시 … 13 = 22시) */
export interface SlotRef {
    dayIndex: number;
    hourIndex: number;
}

/** 칸을 칠할 수 없는 이유. null = 열린 칸 */
export type CellBlock = 'past' | 'booked' | null;

/** [dayIndex][hourIndex] 2차원 격자 */
export type SlotGrid<T> = T[][];

/** 열지도 색 단계: 0명, ~⅓, ~⅔, 그 이상, 전원 */
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** 우선순위 정렬: 많은 인원 순 / 빠른 시간 순 / 오래 할 수 있는 순 */
export type SortKey = 'people' | 'time' | 'length';

/** 예약 버튼 종류: 바로 예약 / 미리 예약 / 버튼 없음 */
export type ReservationKind = 'instant' | 'pre' | 'none';

/** 서버 주차 기준 날짜가 속한 주 */
export type WeekSlot = 'main' | 'next';

export interface PriorityCard {
    dayIndex: number;
    /** 구간 첫 칸의 시간 인덱스 */
    startHourIndex: number;
    /** 이어지는 칸 수 (= 시간) */
    length: number;
    /** 이 구간에 되는 참여자 id (구간 안에서 모두 같음) */
    participantIds: string[];
    /** 구간 안에서 미리 예약 대기 팀이 가장 적은 칸의 시간 인덱스 (같으면 이른 칸) */
    recommendedHourIndex: number;
}
