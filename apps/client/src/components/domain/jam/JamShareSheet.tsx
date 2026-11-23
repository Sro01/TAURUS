import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface JamShareSheetProps {
  open: boolean;
  url: string;
  /** 시트를 닫는다 (나중에 할게요, 바깥 누르기) */
  onClose: () => void;
  /** 링크를 복사했을 때. 시트를 닫고 토스트를 띄우는 건 부른 쪽이 한다 */
  onCopied: () => void;
}

/** 링크를 보여 주는 바닥 시트 (시안 "링크 공유"). 방을 만든 직후와 공유 버튼에서 열린다 */
export default function JamShareSheet({ open, url, onClose, onCopied }: JamShareSheetProps) {
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFailed(false);
      onCopied();
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent className="mx-auto max-w-md gap-[18px] rounded-t-[22px] border-0 bg-card px-5 pb-6 pt-3">
        <DrawerHeader className="gap-1.5 p-0 text-left">
          <DrawerTitle className="text-xl font-extrabold">링크가 만들어졌어요</DrawerTitle>
          <DrawerDescription className="text-[15px] text-muted-foreground">
            단톡방에 보내면 다 같이 시간을 칠할 수 있어요.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex h-12 items-center gap-2 rounded-[10px] border border-border bg-background py-0 pl-3.5 pr-1.5">
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{url}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="링크 복사"
            className="size-10 text-zinc-300"
            onClick={handleCopy}
          >
            <Copy className="size-[18px]" aria-hidden="true" />
          </Button>
        </div>

        {copyFailed && (
          <p role="alert" className="-my-2 text-[13px] text-red-400">
            복사하지 못했어요. 링크를 길게 눌러 복사해 주세요
          </p>
        )}

        <div className="flex flex-col gap-1">
          <Button type="button" className="h-13 rounded-xl text-base font-bold" onClick={handleCopy}>
            링크 복사하기
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-sm text-muted-foreground"
            onClick={onClose}
          >
            나중에 할게요
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
