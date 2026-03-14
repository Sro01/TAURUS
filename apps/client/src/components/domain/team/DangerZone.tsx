import { SettingsRow, Button, InlineAlert } from '../../common';

interface DangerZoneProps {
  onDelete: () => void;
  isDeleting: boolean;
}

export default function DangerZone({ onDelete, isDeleting }: DangerZoneProps) {
  return (
    <div className="mt-12 pt-8 border-t border-white/15">
      <InlineAlert variant="error" title="WARNING">
        <SettingsRow 
          label="팀 삭제 및 탈퇴" 
          description="팀을 삭제하면 모든 예약 내역과 정보가 영구적으로 사라집니다."
          className="border-0! p-0!"
        >
          <Button 
            variant="danger" 
            onClick={onDelete} 
            disabled={isDeleting}
          >
            {isDeleting ? '삭제 중...' : '팀 삭제'}
          </Button>
        </SettingsRow>
      </InlineAlert>
    </div>
  );
}
