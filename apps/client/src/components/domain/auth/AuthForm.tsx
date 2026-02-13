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
  onCancel?: () => void; // 취소 핸들러 추가
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

  useEffect(() => {
    if (initialName) setName(initialName);
    if (initialPassword) setPassword(initialPassword);
  }, [initialName, initialPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!hideNameField && !name.trim()) || !password.trim()) return;
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
            onChange={(e) => setName(e.target.value)}
            required
            icon={<User className="w-4 h-4" />}
          />
        )}
        <Input
          label="비밀번호"
          type="password"
          placeholder="비밀번호 (4자리 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          maxLength={4}
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
