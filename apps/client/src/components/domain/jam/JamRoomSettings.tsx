import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getJamErrorMessage } from '@/services/jamApi';
import { JAM_MAX_HEADCOUNT, JAM_MAX_TITLE, type JamRoom, type UpdateJamRoomInput } from '@/types/jam';

interface JamRoomSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: JamRoom;
  /** 제목·인원 저장. 서버가 거절하면 던진다 */
  onSave: (input: UpdateJamRoomInput) => Promise<void>;
  /** 빠지기. 실패하면 던진다 */
  onLeave: () => Promise<void>;
}

/** 제목·인원 바꾸기, 방에서 빠지기 (들어온 사람 누구나, 끝나지 않은 방) */
export default function JamRoomSettings({ open, onOpenChange, room, onSave, onLeave }: JamRoomSettingsProps) {
  const joined = room.participants.length;
  // 인원은 참여자 수 아래로 못 내린다 (최소 1)
  const minHeadcount = Math.max(1, joined);

  const [title, setTitle] = useState(room.title);
  const [headcount, setHeadcount] = useState(room.headcount ?? minHeadcount);
  const [unknownCount, setUnknownCount] = useState(room.headcount === null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // 열 때마다 지금 방 값으로 되돌린다
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(room.title);
      setHeadcount(room.headcount ?? minHeadcount);
      setUnknownCount(room.headcount === null);
      setError(null);
    }
  }

  const trimmedTitle = title.trim();
  const nextHeadcount = unknownCount ? null : Math.max(headcount, minHeadcount);
  const canSave = trimmedTitle.length > 0 && !saving;

  const handleSave = async () => {
    const input: UpdateJamRoomInput = {};
    if (trimmedTitle !== room.title) input.title = trimmedTitle;
    if (nextHeadcount !== room.headcount) input.headcount = nextHeadcount;
    if (Object.keys(input).length === 0) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(input);
      onOpenChange(false);
    } catch (e) {
      setError(getJamErrorMessage(e, '저장하지 못했어요. 다시 눌러 주세요'));
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    setSaving(true);
    setLeaveError(null);
    try {
      await onLeave();
      setConfirmLeave(false);
    } catch (e) {
      setLeaveError(getJamErrorMessage(e, '나가지 못했어요. 다시 눌러 주세요'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent aria-describedby={undefined} className="mx-auto max-w-md gap-5 rounded-t-[22px] border-0 bg-card px-5 pb-6 pt-3">
          <DrawerHeader className="gap-1.5 p-0 text-left">
            <DrawerTitle className="text-lg font-extrabold">방 설정</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="jam-room-title">제목</Label>
            <Input
              id="jam-room-title"
              value={title}
              maxLength={JAM_MAX_TITLE}
              autoComplete="off"
              className="h-12 bg-background"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label id="jam-room-headcount-label">몇 명이 함께하나요?</Label>
            <div
              role="group"
              aria-labelledby="jam-room-headcount-label"
              className="grid h-[52px] grid-cols-[56px_1fr_56px] items-center rounded-xl border border-border bg-background"
            >
              <Button
                type="button"
                variant="ghost"
                aria-label="한 명 줄이기"
                className="h-full rounded-xl"
                disabled={unknownCount || headcount <= minHeadcount}
                onClick={() => setHeadcount((n) => Math.max(minHeadcount, n - 1))}
              >
                <Minus className="size-5" aria-hidden="true" />
              </Button>
              <span
                aria-live="polite"
                className={cn('text-center text-base font-bold', unknownCount && 'font-normal text-[#6b6b73]')}
              >
                {unknownCount ? '정해지지 않음' : `${Math.max(headcount, minHeadcount)}명`}
              </span>
              <Button
                type="button"
                variant="ghost"
                aria-label="한 명 늘리기"
                className="h-full rounded-xl"
                disabled={unknownCount || headcount >= JAM_MAX_HEADCOUNT}
                onClick={() => setHeadcount((n) => Math.min(JAM_MAX_HEADCOUNT, n + 1))}
              >
                <Plus className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="jam-room-unknown-count"
                checked={unknownCount}
                onCheckedChange={(v) => setUnknownCount(v === true)}
              />
              <Label htmlFor="jam-room-unknown-count" className="text-sm font-normal">
                아직 몰라요
              </Label>
            </div>
          </div>

          {error && (
            <p role="alert" className="-my-2 text-[13px] text-[#f87171]">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <Button
              type="button"
              disabled={!canSave}
              className="h-13 rounded-xl text-base font-bold"
              onClick={handleSave}
            >
              저장하기
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-sm text-[#f87171] hover:text-[#f87171]"
              onClick={() => {
                // 시트와 확인 창이 겹치지 않게 시트를 먼저 닫는다
                onOpenChange(false);
                setLeaveError(null);
                setConfirmLeave(true);
              }}
            >
              방 나가기
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>방에서 나갈까요?</DialogTitle>
            <DialogDescription>나가면 내 시간이 지워져요.</DialogDescription>
          </DialogHeader>
          {leaveError && (
            <p role="alert" className="text-[13px] text-[#f87171]">
              {leaveError}
            </p>
          )}
          <DialogFooter className="grid grid-cols-2 gap-2 sm:flex-none">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setConfirmLeave(false)}>
              취소
            </Button>
            <Button type="button" variant="destructive" disabled={saving} onClick={handleLeave}>
              나가기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
