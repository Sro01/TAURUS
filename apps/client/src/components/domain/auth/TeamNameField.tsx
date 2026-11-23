import { useRef, useState } from 'react';
// ui의 CommandInput은 검색 아이콘과 밑줄 테두리가 고정이라, 팀 이름 칸에는 cmdk 원본 입력을 써요
import { Command as CommandPrimitive } from 'cmdk';
import { User } from 'lucide-react';
import { WarningCircle } from '@phosphor-icons/react';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TeamNameHint } from '@/utils/teamNameHint';

interface TeamNameFieldProps {
  label: string;
  placeholder?: string;
  value: string;
  /** 사용자가 입력을 바꿨을 때 */
  onChange: (value: string) => void;
  /** 드롭다운에서 팀을 골랐을 때 (이름 바꾸기와 비밀번호 칸으로 포커스는 부모가 해요) */
  onSelectTeam: (name: string) => void;
  hint: TeamNameHint;
  /** 폼 검증 오류. 있으면 안내 문구 대신 보여요 */
  error?: string;
}

const NEW_TEAM_VALUE = '__new-team__';

/** 팀 이름 입력 + 비슷한 팀 드롭다운. 이름 비교는 하지 않고 `hint`(서버 응답)만 보여 줘요. */
export default function TeamNameField({
  label,
  placeholder,
  value,
  onChange,
  onSelectTeam,
  hint,
  error,
}: TeamNameFieldProps) {
  // 사용자가 입력을 바꾼 뒤에만 열어요. 미리 채워진 이름으로는 열리지 않아요.
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { items, showNewTeam } = hint;
  const listVisible = open && items.length > 0;

  // 서버가 막은 이름(problem)의 문구는 폼 검증 오류보다 먼저 보여요
  const message = hint.isError ? hint.message : error || (listVisible ? null : hint.message);
  const isError = Boolean(error) || hint.isError;

  const handleChange = (next: string) => {
    onChange(next);
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 드롭다운이 닫혀 있으면 Enter는 폼 제출로 가야 해요 (Command가 가로채지 못하게)
    if (e.key === 'Enter' && !listVisible) e.stopPropagation();
  };

  const handleSelectTeam = (name: string) => {
    setOpen(false);
    onSelectTeam(name);
  };

  return (
    <Command
      shouldFilter={false}
      loop
      vimBindings={false}
      label={label}
      className="h-auto overflow-visible rounded-none bg-transparent text-left"
    >
      <Label onClick={() => inputRef.current?.focus()} className="mb-1.5 ml-1 block text-sm font-medium text-text-sub">
        {label}
      </Label>

      <Popover open={listVisible} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-sub">
              <User className="w-4 h-4" />
            </div>
            <CommandPrimitive.Input
              ref={inputRef}
              value={value}
              onValueChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-invalid={isError || undefined}
              className={cn(
                'w-full rounded-xl border bg-bg-main py-3 pl-10 pr-4 text-white outline-none transition-all placeholder:text-text-sub/50 disabled:cursor-not-allowed disabled:opacity-50',
                isError
                  ? 'border-status-danger/50 focus:border-status-danger focus:ring-1 focus:ring-status-danger/50'
                  : 'border-white/10 focus:border-primary focus:ring-1 focus:ring-primary/50',
              )}
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="z-[60] w-(--radix-popover-trigger-width) overflow-hidden rounded-xl border-white/10 bg-card p-0"
          // 입력 칸에서 포커스가 빠지지 않게 해요
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          // Esc는 드롭다운만 닫고 모달까지 닫히지 않게 해요 (모달은 window에서 Esc를 들어요)
          onEscapeKeyDown={(e) => e.stopPropagation()}
          // 입력 칸을 누르는 건 바깥 클릭이 아니에요
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
          }}
        >
          {/*
            열릴 때와 목록이 바뀔 때 "새 팀으로 예약" 줄이 항상 가리켜져야 Enter가 엉뚱한 팀을 고르지 않아요.
            cmdk는 값을 직접 정하지 않은 모든 경우(입력 변경, 항목 마운트·언마운트)에 DOM 순서의 첫 항목을 가리켜요
            (cmdk 소스의 selectFirstItem). value를 controlled로 넘겨도 cmdk가 자기 값을 바꾼 걸 우리가 무시하면
            화면과 cmdk 값이 어긋나서, 새 팀 줄을 DOM 맨 앞에 두고 화면에서만 맨 아래로(order-last) 보내요.
          */}
          <CommandList className="max-h-[220px] [&>[cmdk-list-sizer]]:flex [&>[cmdk-list-sizer]]:flex-col">
            {showNewTeam && (
              <CommandItem
                value={NEW_TEAM_VALUE}
                onSelect={() => setOpen(false)}
                className="sticky bottom-0 order-last h-11 rounded-none border-t border-white/10 bg-card px-4 text-base data-[selected=true]:bg-accent"
              >
                <span className="truncate">'{value}' 새 팀으로 예약</span>
              </CommandItem>
            )}
            {items.map((team) => (
              <CommandItem
                key={team.id}
                value={team.id}
                onSelect={() => handleSelectTeam(team.name)}
                className="h-11 rounded-none px-4 text-base"
              >
                <span className="truncate">{team.name}</span>
              </CommandItem>
            ))}
          </CommandList>
        </PopoverContent>
      </Popover>

      {message && (
        <p
          className={cn(
            'mt-1.5 ml-1 flex items-center gap-1 text-xs',
            isError ? 'text-status-danger' : 'text-text-sub',
          )}
        >
          {isError && <WarningCircle size={14} weight="fill" className="shrink-0" />}
          {message}
        </p>
      )}
    </Command>
  );
}
