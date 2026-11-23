import { useRef, useState } from 'react';
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
  const [highlighted, setHighlighted] = useState('');
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { items, showNewTeam } = hint;
  const listVisible = open && items.length > 0;

  // 아무 줄도 고르지 않고 Enter를 눌러도 엉뚱한 팀으로 바뀌지 않게, 새 팀 줄을 먼저 가리켜요.
  const rowValues = [...items.map((t) => t.id), ...(showNewTeam ? [NEW_TEAM_VALUE] : [])];
  const activeValue = rowValues.includes(highlighted)
    ? highlighted
    : showNewTeam
      ? NEW_TEAM_VALUE
      : (rowValues[0] ?? '');

  const message = error || (listVisible ? null : hint.message);
  const isError = Boolean(error) || hint.isError;

  const handleChange = (next: string) => {
    onChange(next);
    setHighlighted('');
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
      value={activeValue}
      onValueChange={setHighlighted}
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
          <CommandList className="max-h-[220px]">
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
            {showNewTeam && (
              <CommandItem
                value={NEW_TEAM_VALUE}
                onSelect={() => setOpen(false)}
                className="sticky bottom-0 h-11 rounded-none border-t border-white/10 bg-card px-4 text-base data-[selected=true]:bg-accent"
              >
                <span className="truncate">'{value}' 새 팀으로 예약</span>
              </CommandItem>
            )}
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
