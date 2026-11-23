import { BadRequestException } from '@nestjs/common';
import dayjs from './dayjs';
import { SLOT_END_HOUR, SLOT_START_HOUR } from '../constants';

/**
 * 예약 칸 시작 시각 검사 (KST 기준).
 * 정시(분·초 0)이고 SLOT_START_HOUR ~ SLOT_END_HOUR 사이여야 한다.
 */
export function assertSlotStart(kstTime: dayjs.Dayjs): void {
    if (kstTime.minute() !== 0 || kstTime.second() !== 0) {
        throw new BadRequestException('예약은 매 시 정각에만 가능합니다.');
    }

    const hour = kstTime.hour();
    if (hour < SLOT_START_HOUR || hour > SLOT_END_HOUR) {
        throw new BadRequestException(`예약 가능 시간은 ${SLOT_START_HOUR}:00 ~ ${SLOT_END_HOUR}:00 (KST)입니다.`);
    }
}
