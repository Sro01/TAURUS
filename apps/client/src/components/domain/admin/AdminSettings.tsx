import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../../services';
import { Card, Button, Input } from '../../common';
import { Settings } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState<{ maxSlotsPerWeek: number; maxSlotsPerDay: number } | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await adminService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await adminService.updateSettings(settings);
      alert('설정이 저장되었습니다.');
    } catch (error) {
      console.error(error);
      alert('설정 저장 실패');
    }
  };

  if (!settings) return <div className="text-center py-10">설정 로딩 중...</div>;

  return (
    <Card className="p-8 max-w-xl mx-auto border-primary/20 bg-gradient-to-br from-bg-card to-bg-main">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">시스템 정책 설정</h3>
          <p className="text-sm text-text-sub">팀별 예약 가능 시간 제한 등을 관리합니다.</p>
        </div>
      </div>

      <div className="space-y-6">
        <Input 
          label="주당 최대 예약 가능 시간" 
          type="number" 
          value={settings.maxSlotsPerWeek}
          onChange={(e) => setSettings({...settings, maxSlotsPerWeek: parseInt(e.target.value)})}
          placeholder="예: 4 (1슬롯=50분)"
        />
        <Input 
          label="일일 최대 예약 가능 시간" 
          type="number" 
          value={settings.maxSlotsPerDay}
          onChange={(e) => setSettings({...settings, maxSlotsPerDay: parseInt(e.target.value)})}
          placeholder="예: 2"
        />
        
        <div className="pt-4">
          <Button onClick={handleSaveSettings} fullWidth className="shadow-lg shadow-primary/30 py-3">
            설정 데이터 저장하기
          </Button>
        </div>
      </div>
    </Card>
  );
}
