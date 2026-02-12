/**
 * dayjs 공통 유틸
 * 프로젝트 전역에서 일관된 dayjs 인스턴스를 사용하기 위한 모듈
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);

export default dayjs;
