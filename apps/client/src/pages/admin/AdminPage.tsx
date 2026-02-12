import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from '../../utils/dayjs';
import { useAuth, useWeek, useReservation } from '../../hooks';
import { adminService } from '../../services';
import { PageContainer, Button, Card } from '../../components/common';
import AuthModal from '../../components/domain/auth/AuthModal';
import { Trash2 } from 'lucide-react';

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, loginAdmin, logoutAdmin } = useAuth();
  
  // 상태
  const [activeTab, setActiveTab] = useState<'reservations' | 'settings' | 'teams'>('reservations');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(0);
  
  // Settings State
  const [settings, setSettings] = useState<{ maxSlotsPerWeek: number; maxSlotsPerDay: number } | null>(null);
  
  // Admin Reservation State
  const [isAdminResModalOpen, setIsAdminResModalOpen] = useState(false);
  const [adminResDate, setAdminResDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [adminResTime, setAdminResTime] = useState('09:00');
  const [adminResDesc, setAdminResDesc] = useState('');

  // Teams State
  const [teams, setTeams] = useState<any[]>([]);
  const [teamSearch, setTeamSearch] = useState('');

  // 훅
  const { allWeeks, loading: weekLoading, refreshAllWeeks } = useWeek();
  const { reservations, loading: resLoading, getReservations } = useReservation();

  // 초기 진입 및 데이터 로드
  useEffect(() => {
    if (!isAdminAuthenticated) {
      setIsAuthModalOpen(true);
    } else {
      refreshAllWeeks();
      loadSettings();
      loadTeams();
    }
  }, [isAdminAuthenticated, refreshAllWeeks]);

  // Settings Load
  const loadSettings = async () => {
    try {
      const data = await adminService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  // Teams Load
  const loadTeams = async () => {
    try {
      // teamService.getTeams()는 공개 API지만 관리자도 사용 가능
      // 실제로는 adminService에 getAllTeams가 있으면 좋지만 지금은 teamService 재사용
      const import_teamService = (await import('../../services')).teamService;
      const data = await import_teamService.getTeams(teamSearch);
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams', error);
    }
  };

  // 주차 목록 로드되면 최신 주차 선택
  useEffect(() => {
    if (allWeeks && allWeeks.length > 0 && selectedWeekNumber === 0) {
       const latest = [...allWeeks].sort((a, b) => b.weekNumber - a.weekNumber)[0];
       setSelectedWeekNumber(latest.weekNumber);
    }
  }, [allWeeks, selectedWeekNumber]);

  // 주차 변경 시 예약 조회
  useEffect(() => {
    if (selectedWeekNumber > 0 && activeTab === 'reservations') {
      getReservations(selectedWeekNumber.toString());
    }
  }, [selectedWeekNumber, getReservations, activeTab]);

  // Search Teams Effect
  useEffect(() => {
    if (activeTab === 'teams') {
      const timer = setTimeout(() => {
        loadTeams();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [teamSearch, activeTab]);

  // ... (handleAuthSubmit, handleCancelReservation 등 기존 로직 유지)

  // 시스템 설정 저장
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

  // 관리자 예약 생성
  const handleCreateAdminReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startTime = dayjs(`${adminResDate}T${adminResTime}`).toISOString();
      await adminService.createReservation({
        startTime,
        description: adminResDesc
      });
      alert('관리자 예약이 생성되었습니다.');
      setIsAdminResModalOpen(false);
      setAdminResDesc('');
      if (selectedWeekNumber > 0) getReservations(selectedWeekNumber.toString());
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || '예약 생성 실패';
      alert(`오류 발생: ${message}`);
    }
  };

  // 팀 삭제
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`'${teamName}' 팀을 삭제하시겠습니까? 돌이킬 수 없습니다.`)) return;
    try {
      await adminService.deleteTeam(teamId);
      loadTeams();
    } catch (error) {
      console.error(error);
      alert('팀 삭제 실패');
    }
  };

  // 기존 handleAuthSubmit, handleCancelReservation, handleLogout 등은 그대로 둠 (아래 return에서 사용)
  // handleAuthSubmit
  const handleAuthSubmit = async (_: string, password: string) => {
    try {
      const { access_token } = await adminService.verify(password);
      loginAdmin(access_token);
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error(error);
      alert('관리자 인증에 실패했습니다.');
    }
  };

  const handleCancelReservation = async (id: string, teamName: string) => {
    if (!confirm(`'${teamName}' 팀의 예약을 취소하시겠습니까? (관리자 권한)`)) return;
    try {
      await adminService.cancelReservation(id); 
      if (selectedWeekNumber > 0) getReservations(selectedWeekNumber.toString());
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || '예약 취소 실패';
      alert(`오류 발생: ${message}`);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthModalOpen(true); 
    setSelectedWeekNumber(0);
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="text-center">
          <p className="text-text-sub mb-4">관리자 페이지 접근 권한이 필요합니다.</p>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => navigate('/')}
          onSubmit={handleAuthSubmit}
          title="관리자 인증"
          hideNameField
        />
      </div>
    );
  }

  return (
    <PageContainer title="관리자 대시보드">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {['reservations', 'settings', 'teams'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab 
                  ? 'bg-primary text-white' 
                  : 'bg-bg-card text-text-sub hover:bg-white/5'
              }`}
            >
              {tab === 'reservations' ? '예약 관리' : tab === 'settings' ? '시스템 설정' : '팀 관리'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
           {activeTab === 'reservations' && (
             <Button onClick={() => setIsAdminResModalOpen(true)} className="text-sm">
               + 관리자 예약 생성
             </Button>
           )}
           <Button variant="outline" onClick={handleLogout} className="text-xs">
             로그아웃
           </Button>
        </div>
      </div>

      {activeTab === 'reservations' && (
        <>
          {/* 주차 선택 UI (기존 코드 재사용) */}
          <div className="mb-6 overflow-x-auto pb-2">
            {weekLoading ? (
              <div className="text-sm text-text-sub px-1">주차 정보를 불러오는 중...</div>
            ) : (
              <div className="flex gap-2">
                {allWeeks?.map(week => (
                  <button
                    key={week.id}
                    onClick={() => setSelectedWeekNumber(week.weekNumber)}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors border ${
                      selectedWeekNumber === week.weekNumber
                        ? 'bg-primary text-white border-primary'
                        : 'bg-bg-card text-text-sub border-white/5 hover:bg-white/5'
                    }`}
                  >
                    {week.weekNumber}주차 ({dayjs(week.startDate).format('MM.DD')}~)
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 예약 목록 UI (기존 코드 재사용) */}
          <div className="space-y-3">
            {resLoading ? (
              <div className="text-center text-text-sub py-8">로딩 중...</div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-10 bg-white/5 rounded-lg border border-white/10">
                <p className="text-text-sub">해당 주차에 예약이 없습니다.</p>
              </div>
            ) : (
              reservations.map(res => (
                <Card key={res.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-white">
                        {res.team ? res.team.name : 'Unknown Team'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        res.status === 'CONFIRMED' ? 'bg-success/20 text-success' :
                        res.status === 'PENDING' ? 'bg-primary/20 text-primary' :
                        res.type === 'ADMIN' ? 'bg-warning/20 text-warning' :
                        'bg-white/10 text-text-sub'
                      }`}>
                        {res.type === 'ADMIN' ? '관리자 예약' : res.status}
                      </span>
                    </div>
                    <div className="text-sm text-text-sub">
                      {dayjs(res.startTime).format('M/D(ddd) HH:mm')} 
                      {res.type === 'ADMIN' && <span className="ml-2 text-white/50">Only Admin</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelReservation(res.id, res.team ? res.team.name : 'Unknown Team')}
                    className="p-2 text-text-sub hover:text-error hover:bg-error/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'settings' && settings && (
        <Card className="p-6 max-w-md mx-auto">
          <h3 className="text-xl font-bold mb-4">시스템 설정</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-text-sub mb-1">주당 최대 예약 가능 시간 (MaxSlotsPerWeek)</label>
              <input 
                type="number" 
                value={settings.maxSlotsPerWeek}
                onChange={(e) => setSettings({...settings, maxSlotsPerWeek: parseInt(e.target.value)})}
                className="w-full bg-bg-main border border-white/10 rounded px-3 py-2 text-white focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-text-sub mb-1">일일 최대 예약 가능 시간 (MaxSlotsPerDay)</label>
              <input 
                type="number" 
                value={settings.maxSlotsPerDay}
                onChange={(e) => setSettings({...settings, maxSlotsPerDay: parseInt(e.target.value)})}
                className="w-full bg-bg-main border border-white/10 rounded px-3 py-2 text-white focus:border-primary outline-none"
              />
            </div>
            <Button onClick={handleSaveSettings} fullWidth className="mt-4">
              설정 저장
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="팀 이름 검색..." 
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary outline-none"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => (
               <Card key={team.id} className="p-4 flex justify-between items-center group">
                 <div>
                   <h4 className="font-bold text-lg">{team.name}</h4>
                   <p className="text-xs text-text-sub">Joined: {dayjs(team.createdAt).format('YYYY-MM-DD')}</p>
                 </div>
                 <button 
                   onClick={() => handleDeleteTeam(team.id, team.name)}
                   className="p-2 text-text-sub hover:text-error bg-white/5 hover:bg-error/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                   title="팀 강제 삭제"
                 >
                   <Trash2 className="w-5 h-5" />
                 </button>
               </Card>
            ))}
            {teams.length === 0 && (
              <div className="col-span-full text-center py-8 text-text-sub">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>
      )}

      {/* 관리자 예약 모달 */}
      <AuthModal
        isOpen={isAdminResModalOpen}
        onClose={() => setIsAdminResModalOpen(false)}
        onSubmit={async () => {}} // Dummy, 실제 폼은 아래 children으로 구현하거나 AuthModal을 일반 Modal로 교체해야 함. 
        // AuthModal은 이름/비번 입력용이므로 적절하지 않음. 그냥 간단한 커스텀 모달 오버레이 구현
        title=""
        hideNameField
      />
      {isAdminResModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-bg-card w-full max-w-md p-6 rounded-2xl shadow-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4">관리자 예약 생성</h3>
            <form onSubmit={handleCreateAdminReservation} className="space-y-4">
               <div>
                  <label className="block text-sm text-text-sub mb-1">날짜</label>
                  <input 
                    type="date"
                    value={adminResDate}
                    onChange={(e) => setAdminResDate(e.target.value)}
                    className="w-full bg-bg-main border border-white/10 rounded px-3 py-2 text-white"
                    required
                  />
               </div>
               <div>
                  <label className="block text-sm text-text-sub mb-1">시간</label>
                  <select 
                    value={adminResTime} 
                    onChange={(e) => setAdminResTime(e.target.value)}
                    className="w-full bg-bg-main border border-white/10 rounded px-3 py-2 text-white"
                  >
                    {Array.from({ length: 14 }, (_, i) => i + 9).map(h => (
                      <option key={h} value={`${String(h).padStart(2, '0')}:00`}>
                        {h}:00 ~ {h}:50
                      </option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="block text-sm text-text-sub mb-1">설명 (메모)</label>
                  <input 
                    type="text"
                    value={adminResDesc}
                    onChange={(e) => setAdminResDesc(e.target.value)}
                    placeholder="예: 운영진 회의"
                    className="w-full bg-bg-main border border-white/10 rounded px-3 py-2 text-white"
                   required
                  />
               </div>
               <div className="flex gap-2 pt-2">
                 <Button type="button" variant="ghost" fullWidth onClick={() => setIsAdminResModalOpen(false)}>취소</Button>
                 <Button type="submit" fullWidth>예약 생성</Button>
               </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
