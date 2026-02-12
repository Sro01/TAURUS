import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { Card, Button } from '../../components/common';
import { useWeek } from '../../hooks';
import { authService } from '../../services';
import AuthModal from '../../components/domain/auth/AuthModal';
import dayjs from '../../utils/dayjs';

export default function HomePage() {
  const navigate = useNavigate();
  const { currentWeek } = useWeek();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const handleRegister = async (name: string, password: string) => {
    try {
      await authService.register({ name, password });
      alert(`'${name}' 팀이 등록되었습니다.\n이제 '바로 예약' 또는 '미리 예약'을 이용할 수 있습니다.`);
      setIsRegisterModalOpen(false);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || '팀 등록에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold text-primary tracking-tight">TAURUS</h1>
        <p className="text-text-sub text-lg">
          효율적인 합주실 예약 시스템
        </p>
        
        {currentWeek && (
          <div className="inline-block mt-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-text-sub">
            <span className="text-primary font-bold mr-1">NOW</span>
            {currentWeek.weekNumber}주차 예약 진행 중 
            <span className="text-white/30 mx-2">|</span>
            {dayjs(currentWeek.startDate).format('MM.DD')} ~ {dayjs(currentWeek.endDate).format('MM.DD')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 w-full max-w-sm mt-4">
        <Card 
          onClick={() => navigate('/instant-reservation')} 
          hoverable 
          className="p-6 relative overflow-hidden group border-primary/20"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-24 h-24 text-primary" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Clock className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-text-sub group-hover:text-primary transition-colors" />
            </div>
            <h2 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">바로 예약</h2>
            <p className="text-sm text-text-sub">이번 주 합주실 예약하기</p>
          </div>
        </Card>

        <Card 
          onClick={() => navigate('/pre-reservation')} 
          hoverable 
          className="p-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Calendar className="w-24 h-24 text-text-main" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-white/5 rounded-lg text-text-main">
                <Calendar className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-text-sub group-hover:text-text-main transition-colors" />
            </div>
            <h2 className="text-xl font-bold mb-1 group-hover:text-text-main transition-colors">미리 예약</h2>
            <p className="text-sm text-text-sub">다음 주 합주실 미리 신청하기</p>
          </div>
        </Card>
      </div>

      <div className="mt-8 flex gap-4">
        <Button 
          variant="outline" 
          onClick={() => setIsRegisterModalOpen(true)} 
          className="px-8 py-3 bg-white/5 border-white/10 hover:bg-white/10"
        >
          신규 팀 등록
        </Button>
      </div>

      <AuthModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSubmit={handleRegister}
        title="신규 팀 등록"
        submitLabel="팀 등록"
      />
      
      <p className="text-xs text-text-sub/30 mt-8">
        © 2024 Taurus System. All rights reserved.
      </p>
    </div>
  );
}
