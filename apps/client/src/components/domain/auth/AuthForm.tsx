import { useState, useEffect } from 'react';
import { Input, Button } from '../../common';
import { User, Lock } from 'lucide-react';

interface AuthFormProps {
  initialName?: string;
  initialPassword?: string;
  onSubmit: (name: string, password: string) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  hideNameField?: boolean;
  onCancel?: () => void;
}

// 공백 및 특수문자 방지 (영문 대소문자, 한글, 숫자만 허용)
const VALID_PATTERN = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]+$/;

function validate(value: string, label: string): string {
  if (!value) return `${label}을(를) 입력해주세요.`;
  if (/\s/.test(value)) return `${label}에 공백을 포함할 수 없습니다.`;
  if (!VALID_PATTERN.test(value)) return `${label}에 특수문자를 포함할 수 없습니다.`;
  return '';
}

export default function AuthForm({
  initialName = '',
  initialPassword = '',
  onSubmit,
  isSubmitting = false,
  submitLabel = '확인',
  hideNameField = false,
  onCancel,
}: AuthFormProps) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState(initialPassword);
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (initialName) setName(initialName);
    if (initialPassword) setPassword(initialPassword);
  }, [initialName, initialPassword]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    // 입력 중에도 실시간 검증
    if (nameError) setNameError(validate(value, '팀 이름'));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordError) setPasswordError(validate(value, '비밀번호'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 제출 시 전체 검증
    const newNameError = hideNameField ? '' : validate(name, '팀 이름');
    const newPasswordError = validate(password, '비밀번호');

    setNameError(newNameError);
    setPasswordError(newPasswordError);

    if (newNameError || newPasswordError) return;

    await onSubmit(name, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {!hideNameField && (
          <Input
            label="팀 이름"
            placeholder="팀 이름을 입력하세요"
            value={name}
            onChange={handleNameChange}
            error={nameError}
            icon={<User className="w-4 h-4" />}
          />
        )}
        <Input
          label="비밀번호"
          type="password"
          placeholder="비밀번호 (4자리 이상)"
          value={password}
          onChange={handlePasswordChange}
          error={passwordError}
          required
          maxLength={32}
          icon={<Lock className="w-4 h-4" />}
        />
      </div>

      <div className="pt-2 text-xs text-text-sub text-center">
        * 처음 입력한 비밀번호로 자동 등록되며, 추후 예약 확인에 사용됩니다.
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button variant="ghost" fullWidth onClick={onCancel} type="button">
            취소
          </Button>
        )}
        <Button 
          fullWidth 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? '처리 중...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
