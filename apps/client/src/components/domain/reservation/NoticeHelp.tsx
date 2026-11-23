import { ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface NoticeHelpProps {
  title: string;
  children: ReactNode;
}

/** 제목 줄 오른쪽 끝의 ? 버튼. 누르면 버튼 아래에 필독 사항이 떠요 */
export default function NoticeHelp({ title, children }: NoticeHelpProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={title}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full text-text-sub transition-colors hover:bg-white/10 hover:text-text-main data-[state=open]:bg-white/10 data-[state=open]:text-text-main"
        >
          <CircleHelp className="size-6" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(24rem,calc(100vw-2rem))] rounded-lg border-status-info/20 bg-card p-4 text-sm"
      >
        <strong className="mb-2 block font-bold text-status-info">{title}</strong>
        <div className="leading-relaxed">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
