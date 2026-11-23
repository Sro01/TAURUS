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
  /** 시트를 닫고 방으로 간다 (나중에 할게요, 바깥 누르기, 방으로 가기) */
  onClose: () => void;
}

/** 방을 만든 뒤 링크를 보여 주는 바닥 시트 (시안 "링크 공유") */
export default function JamShareSheet({ open, url, onClose }: JamShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFailed(false);
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

        <p
          role="status"
          className={`-my-2 min-h-5 text-[13px] ${copyFailed ? 'text-red-400' : 'text-foreground'}`}
        >
          {copyFailed ? '복사하지 못했어요. 링크를 길게 눌러 복사해 주세요' : copied ? '링크를 복사했어요' : ''}
        </p>

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
            {copied ? '방으로 가기' : '나중에 할게요'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
