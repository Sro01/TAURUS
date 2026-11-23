import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface JamLoginFormProps {
  onSubmit: (name: string, pin: string) => void | Promise<void>; // 형식 검사를 통과한 값만 넘긴다
  submitting?: boolean; // true면 버튼 비활성
  errorMessage?: string | null; // 서버 오류 문구
  onCancel?: () => void; // 뒤로
}

// 스펙 3.3: 한글 완성형·영문·숫자, 공백 없이 1~10글자 (자음·모음 따로 금지)
const NAME_PATTERN = /^[가-힣A-Za-z0-9]{1,10}$/;
const PIN_PATTERN = /^\d{4}$/;

/** 이름 + 비밀번호 들어오기 폼 (시안 화면 4) */
export default function JamLoginForm({ onSubmit, submitting = false, errorMessage, onCancel }: JamLoginFormProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  // 입력을 고치면 서버 오류 문구를 숨긴다 (서버 문구가 같아도 다시 제출하면 다시 보인다)
  const [errorDismissed, setErrorDismissed] = useState(false);

  const trimmed = name.trim();
  const nameInvalid = trimmed.length > 0 && !NAME_PATTERN.test(trimmed);
  const canSubmit = NAME_PATTERN.test(trimmed) && PIN_PATTERN.test(pin) && !submitting;
  const serverError = errorMessage && !errorDismissed ? errorMessage : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorDismissed(false);
    void onSubmit(trimmed, pin);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      {onCancel && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="뒤로"
          className="-ml-2 size-11 self-start"
          onClick={onCancel}
        >
          <ChevronLeft className="size-6" aria-hidden="true" />
        </Button>
      )}

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-extrabold">이름을 입력하세요</h1>
        <p className="text-[15px] text-muted-foreground">
          전에 쓴 이름과 비밀번호를 넣으면 내 시간을 고칠 수 있어요.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jam-login-name">이름</Label>
        <Input
          id="jam-login-name"
          value={name}
          maxLength={10}
          placeholder="이름 입력"
          autoComplete="off"
          aria-invalid={nameInvalid || undefined}
          className="h-12"
          onChange={(e) => {
            setName(e.target.value.replace(/\s/g, ''));
            setErrorDismissed(true);
          }}
        />
        {nameInvalid && (
          <p className="text-[13px] text-red-400">한글, 영문, 숫자로 10글자까지 입력해 주세요</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jam-login-pin">비밀번호</Label>
        <Input
          id="jam-login-pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          placeholder="숫자 4자리"
          className="h-12"
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
            setErrorDismissed(true);
          }}
        />
        {serverError && (
          <p role="alert" className="text-[13px] text-red-400">
            {serverError}
          </p>
        )}
      </div>

      <Button type="submit" disabled={!canSubmit} className="h-13 rounded-xl text-base font-bold">
        다음
      </Button>
    </form>
  );
}
