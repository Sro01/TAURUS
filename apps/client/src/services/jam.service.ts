import { jamApi } from './jamApi';
import { axiosClient } from './api';
import type {
    CreateJamRoomInput,
    CreateJamRoomResult,
    EnterJamRoomInput,
    EnterJamRoomResult,
    JamRoom,
    SaveJamSlotsInput,
    UpdateJamRoomInput,
} from '../types/jam';
import type { MainWeeksResponse } from '../types/week';

const roomPath = (slug: string) => `/jam-rooms/${encodeURIComponent(slug)}`;

/**
 * 합주 시간 조율 API (스펙 4.4)
 * 방 API는 jamApi(방 출입증), 주차 조회는 기존 axiosClient(공개 API)를 쓴다.
 * 바꾸기·저장·빠지기는 응답 본문을 쓰지 않는다. 끝나면 getRoom으로 다시 받아온다.
 */
export const jamService = {
    /** POST /jam-rooms — 방 만들기 */
    createRoom: async (input: CreateJamRoomInput): Promise<CreateJamRoomResult> => {
        return await jamApi.post('/jam-rooms', input);
    },

    /** GET /jam-rooms/:slug — 방 + 참여자 전부 (출입증 없이도 됨) */
    getRoom: async (slug: string): Promise<JamRoom> => {
        return await jamApi.get(roomPath(slug));
    },

    /** PATCH /jam-rooms/:slug — 제목·인원 바꾸기 (방 출입증) */
    updateRoom: async (slug: string, input: UpdateJamRoomInput): Promise<void> => {
        await jamApi.patch(roomPath(slug), input);
    },

    /** POST /jam-rooms/:slug/participants — 이름+비밀번호로 들어오기. 받은 출입증 보관은 호출한 쪽이 setJamToken으로 */
    enter: async (slug: string, input: EnterJamRoomInput): Promise<EnterJamRoomResult> => {
        return await jamApi.post(`${roomPath(slug)}/participants`, input);
    },

    /** PUT /jam-rooms/:slug/participants/me/slots — 내 가능 칸 통째로 저장 (방 출입증) */
    saveMySlots: async (slug: string, input: SaveJamSlotsInput): Promise<void> => {
        await jamApi.put(`${roomPath(slug)}/participants/me/slots`, input);
    },

    /** DELETE /jam-rooms/:slug/participants/me — 나 빠지기 (방 출입증). 출입증 지우기는 호출한 쪽이 clearJamToken으로 */
    leave: async (slug: string): Promise<void> => {
        await jamApi.delete(`${roomPath(slug)}/participants/me`);
    },

    /**
     * GET /weeks/main — 이번 주(main)·다음 주(next) 주차와 status 둘 다.
     * 기존 weekService.getCurrentWeek()는 main만 돌려줘서 여기 둔다 (week.service.ts는 고치지 않음).
     */
    getMainWeeks: async (): Promise<MainWeeksResponse> => {
        return await axiosClient.get('/weeks/main');
    },
};
