const BASE = 'bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-white outline-none transition-all placeholder:text-text-sub/50 disabled:opacity-50 disabled:cursor-not-allowed';
const FOCUS = 'focus:border-primary focus:ring-1 focus:ring-primary/50';
const ERROR = 'border-status-danger/50 focus:border-status-danger focus:ring-status-danger/50';

/** 입력 칸 한 개의 모양. Input과, Input을 그대로 쓸 수 없는 입력 칸(팀 이름 검색)이 같이 써요 */
export function inputClassName(hasError: boolean): string {
  return `${BASE} ${hasError ? ERROR : FOCUS}`;
}
