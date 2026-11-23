import { useState, useEffect, useRef } from 'react';
import { Input, Button } from '../../common';
import { User, Lock } from 'lucide-react';
import TeamNameField from './TeamNameField';
import { useTeamSearch } from '@/hooks/useTeamSearch';
import { getTeamNameHint } from '@/utils/teamNameHint';

interface AuthFormProps {
  initialName?: string;
  initialPassword?: string;
  onSubmit: (name: string, password: string) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  hideNameField?: boolean;
  onCancel?: () => void;
  /** 팀 이름 칸을 검색 드롭다운으로 바꿔요 (기본 false) */
  teamSearch?: boolean;
}

// 공백 및 특수문자 방지 (영문 대소문자, 한글, 숫자만 허용)
const VALID_PATTERN = /^[a-zA-Z0-9가-힣]+$/;

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
  teamSearch = false,
}: AuthFormProps) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState(initialPassword);
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  // 드롭다운에서 고른 팀 이름. 입력이 이 이름 그대로면 서버가 알려 준 이름이라 문자 검사를 건너뛰어요
  const [pickedName, setPickedName] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  // 검색을 쓰지 않으면 빈 입력으로 불러 요청이 나가지 않아요
  const searching = teamSearch && !hideNameField;
  const search = useTeamSearch(searching ? name : '');
  const hint = getTeamNameHint(searching ? search : null, name);

  useEffect(() => {
    if (initialName) setName(initialName);
    if (initialPassword) setPassword(initialPassword);
  }, [initialName, initialPassword]);

  const changeName = (value: string) => {
    setName(value);
    // 입력 중에도 실시간 검증
    if (nameError) setNameError(validate(value, '팀 이름'));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => changeName(e.target.value);

  const handleSelectTeam = (teamName: string) => {
    setName(teamName);
    setNameError('');
    setPickedName(teamName);
    passwordRef.current?.focus();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordError) setPasswordError(validate(value, '비밀번호'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 제출 시 전체 검증
    // 서버가 알려 준 팀 이름(고른 이름 그대로이거나 지금 입력에 exact가 있음)과 서버가 문구를 정해 준 problem은
    // 화면 문자 검사로 막지 않아요. 응답 전이거나 검색이 실패했으면 기존 검사가 판단해요.
    const knownByServer = teamSearch && ((pickedName !== '' && name === pickedName) || hint.registered);
    const newNameError =
      hideNameField || knownByServer || hint.blocked ? '' : validate(name, '팀 이름');
    const newPasswordError = validate(password, '비밀번호');

    setNameError(newNameError);
    setPasswordError(newPasswordError);

    if (newNameError || newPasswordError) return;

    // 서버가 같은 팀이라고 한 이름이 있으면 그 이름으로, 서버가 막은 이름이면 제출하지 않아요
    if (hint.blocked) return;

    await onSubmit(hint.submitName, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        {!hideNameField && teamSearch && (
          <TeamNameField
            label="팀명"
            placeholder="합주할 곡명, 가수명, 팀명 등 입력 (공백, 특수문자, 중복 불가)"
            value={name}
            onChange={changeName}
            onSelectTeam={handleSelectTeam}
            hint={hint}
            error={nameError}
          />
        )}
        {!hideNameField && !teamSearch && (
          <Input
            label="팀명"
            placeholder="합주할 곡명, 가수명, 팀명 등 입력 (공백, 특수문자, 중복 불가)"
            value={name}
            onChange={handleNameChange}
            error={nameError}
            icon={<User className="w-4 h-4" />}
          />
        )}
        <Input
          ref={passwordRef}
          label="비밀번호"
          type="password"
          placeholder="비밀번호 입력 (4자리 이상)"
          value={password}
          onChange={handlePasswordChange}
          error={passwordError}
          required
          maxLength={32}
          icon={<Lock className="w-4 h-4" />}
        />
      </div>

      <div className="pt-2 text-xs text-text-sub space-y-1">
        <p>* 따로 회원가입 절차 없이, 해당 팀명으로 최초 예약 시 자동으로 팀 등록됩니다.</p>
        <p>* 등록된 팀명 및 비밀번호는 예약 페이지 및 팀 관리 페이지 로그인 시 사용됩니다.</p>
        <p>* 팀 관리 페이지에서 팀명 및 비밀번호 변경이 가능합니다.</p>
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
