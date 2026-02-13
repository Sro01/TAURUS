import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from '../../utils/dayjs';
import { useAuth, useWeek, useReservation } from '../../hooks';
import { adminService } from '../../services';
import { PageContainer, Button, Card, Modal, Input } from '../../components/common';
import AuthModal from '../../components/domain/auth/AuthModal';
import { Trash2, Settings, Users as UsersIcon, Calendar, LogOut, ChevronRight, Clock, Info } from 'lucide-react';
import { Reservation } from '../../types/reservation';
import { Team } from '../../types/team';

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
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamReservations, setSelectedTeamReservations] = useState<Reservation[]>([]);
  const [isTeamResLoading, setIsTeamResLoading] = useState(false);

  // 훅
  const { allWeeks, loading: weekLoading, refreshAllWeeks } = useWeek();
  const { reservations, loading: resLoading, getReservations } = useReservation();


  // 데이터 로드 함수들
  const loadSettings = useCallback(async () => {
    try {
      const data = await adminService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const { teamService } = await import('../../services');
      const data = await teamService.getTeams(teamSearch);
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams', error);
    }
  }, [teamSearch]);

  const loadTeamReservations = async (teamId: string) => {
    try {
      setIsTeamResLoading(true);
      const data = await adminService.getReservationsByTeam(teamId);
      setSelectedTeamReservations(data);
    } catch (error) {
      console.error('Failed to load team reservations', error);
    } finally {
      setIsTeamResLoading(false);
    }
  };

  // 초기 진입 및 데이터 로드
  useEffect(() => {
    if (!isAdminAuthenticated) {
      setIsAuthModalOpen(true);
    } else {
      refreshAllWeeks();
      loadSettings();
      loadTeams();
    }
  }, [isAdminAuthenticated, refreshAllWeeks, loadSettings, loadTeams]);

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
  }, [teamSearch, activeTab, loadTeams]);

  // 핸들러
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

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthModalOpen(true); 
    setSelectedWeekNumber(0);
    setSelectedTeam(null);
  };

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
      if (selectedTeam?.id === teamId) setSelectedTeam(null);
    } catch (error) {
      console.error(error);
      alert('팀 삭제 실패');
    }
  };

  const handleCancelReservation = async (id: string, teamName: string) => {
    if (!confirm(`'${teamName}' 팀의 예약을 취소하시겠습니까? (관리자 권한)`)) return;
    try {
      await adminService.cancelReservation(id); 
      if (selectedWeekNumber > 0) getReservations(selectedWeekNumber.toString());
      if (selectedTeam) loadTeamReservations(selectedTeam.id);
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || '예약 취소 실패';
      alert(`오류 발생: ${message}`);
    }
  };

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    loadTeamReservations(team.id);
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
      {/* 상단 네비게이션 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-bg-card p-4 rounded-2xl border border-white/5">
        <div className="flex gap-1 bg-bg-main p-1 rounded-xl">
          {[
            { id: 'reservations', label: '예약 관리', icon: Calendar },
            { id: 'teams', label: '팀 관리', icon: UsersIcon },
            { id: 'settings', label: '시스템 설정', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-text-sub hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
           {activeTab === 'reservations' && (
             <Button onClick={() => setIsAdminResModalOpen(true)} className="text-sm py-2">
               + 관리자 예약
             </Button>
           )}
           <Button variant="ghost" onClick={handleLogout} className="text-sm p-2 text-text-sub hover:text-error">
             <LogOut className="w-5 h-5" />
           </Button>
        </div>
      </div>

      {/* 예약 관리 탭 */}
      {activeTab === 'reservations' && (
        <div className="space-y-6">
          {/* 주차 선택 드롭다운 */}
          <div className="flex items-center gap-4 bg-bg-card p-4 rounded-xl border border-white/5">
            <span className="text-sm font-medium text-text-sub shrink-0">주차 선택</span>
            <select
              value={selectedWeekNumber}
              onChange={(e) => setSelectedWeekNumber(Number(e.target.value))}
              className="w-full max-w-xs bg-bg-main border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-primary transition-colors"
            >
              <option value={0} disabled>주차를 선택하세요</option>
              {allWeeks?.map(week => (
                <option key={week.id} value={week.weekNumber}>
                  {week.weekNumber}주차 ({dayjs(week.startDate).format('MM.DD')} ~ {dayjs(week.endDate).format('MM.DD')})
                </option>
              ))}
            </select>
            {weekLoading && <span className="text-xs text-primary animate-pulse">업데이트 중...</span>}
          </div>

          {/* 예약 목록 */}
          <div className="space-y-3">
            {resLoading ? (
              <div className="text-center text-text-sub py-20 animate-pulse">예약 데이터를 불러오는 중...</div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-20 bg-bg-card/50 rounded-2xl border border-dashed border-white/10">
                <p className="text-text-sub">해당 주차에 예약이 없습니다.</p>
              </div>
            ) : (
              reservations.map(res => (
                <Card key={res.id} className="p-4 flex items-center justify-between group hover:bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      res.type === 'ADMIN' ? 'bg-warning/10 text-warning' :
                      res.status === 'CONFIRMED' ? 'bg-success/10 text-success' :
                      'bg-primary/10 text-primary'
                    }`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white">
                          {res.team ? res.team.name : (res.type === 'ADMIN' ? '관리자 점유' : 'Unknown Team')}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                          res.status === 'CONFIRMED' ? 'bg-success/20 text-success' :
                          res.status === 'PENDING' ? 'bg-primary/20 text-primary' :
                          'bg-white/10 text-text-sub'
                        }`}>
                          {res.type === 'ADMIN' ? 'ADMIN' : res.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-sub font-mono">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dayjs(res.startTime).format('M/D(ddd) HH:mm')} ~ {dayjs(res.endTime).format('HH:mm')}
                        </div>
                        {res.type === 'ADMIN' && (
                          <div className="flex items-center gap-1 text-warning/70">
                            <Info className="w-3 h-3" />
                            {res.description || '관리자 메모 없음'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelReservation(res.id, res.team?.name || (res.type === 'ADMIN' ? '관리자' : '알 수 없는 팀'))}
                    className="p-3 text-text-sub hover:text-error hover:bg-error/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* 시스템 설정 탭 */}
      {activeTab === 'settings' && settings && (
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
      )}

      {/* 팀 관리 탭 */}
      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 팀 목록 리스트 (좌측) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative">
              <Input 
                placeholder="팀 이름 검색..." 
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="pl-4"
              />
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {teams.map(team => (
                <div 
                  key={team.id}
                  onClick={() => handleTeamClick(team)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center group ${
                    selectedTeam?.id === team.id
                      ? 'bg-primary/10 border-primary text-white'
                      : 'bg-bg-card border-white/5 hover:border-white/20'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-lg">{team.name}</h4>
                    <p className="text-xs text-text-sub font-mono">ID: {team.id.slice(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id, team.name); }}
                      className="p-2 text-text-sub hover:text-error bg-white/5 hover:bg-error/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-text-sub" />
                  </div>
                </div>
              ))}
              {teams.length === 0 && (
                <div className="text-center py-20 text-text-sub bg-bg-card/30 rounded-2xl border border-dashed border-white/5">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* 팀 상세 및 예약 이력 (우측) */}
          <div className="lg:col-span-7">
            {selectedTeam ? (
              <div className="bg-bg-card rounded-2xl border border-white/10 p-6 sticky top-24 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">{selectedTeam.name}</h3>
                    <p className="text-sm text-text-sub">가입일: {dayjs(selectedTeam.createdAt).format('YYYY-MM-DD HH:mm')}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedTeam.role === 'ADMIN' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
                  }`}>
                    {selectedTeam.role}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6">
                  <h4 className="text-sm font-bold text-text-sub uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 예약 이력
                  </h4>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {isTeamResLoading ? (
                      <div className="text-center py-10 text-text-sub animate-pulse">예약 목록 로딩 중...</div>
                    ) : selectedTeamReservations.length === 0 ? (
                      <div className="text-center py-10 bg-white/5 rounded-xl text-text-sub text-sm">
                        예약 내역이 없습니다.
                      </div>
                    ) : (
                      selectedTeamReservations.map(res => (
                        <div key={res.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <div className="text-sm font-bold text-white mb-0.5">
                              {dayjs(res.startTime).format('YYYY-MM-DD (ddd)')}
                            </div>
                            <div className="text-xs text-text-sub font-mono">
                              {dayjs(res.startTime).format('HH:mm')} ~ {dayjs(res.endTime).format('HH:mm')}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              res.status === 'CONFIRMED' ? 'bg-success/20 text-success' :
                              res.status === 'PENDING' ? 'bg-primary/20 text-primary' :
                              'bg-white/10 text-text-sub'
                            }`}>
                              {res.status}
                            </span>
                            <button 
                              onClick={() => handleCancelReservation(res.id, selectedTeam.name)}
                              className="text-text-sub hover:text-error transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 bg-bg-card/30 rounded-2xl border border-dashed border-white/10 text-text-sub">
                <UsersIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>팀을 선택하면 상세 정보와 예약 이력을 볼 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 관리자 예약 모달 */}
      <Modal
        isOpen={isAdminResModalOpen}
        onClose={() => setIsAdminResModalOpen(false)}
        title="관리자 권한 직접 예약"
      >
        <form onSubmit={handleCreateAdminReservation} className="space-y-5">
           <Input 
             label="날짜 선택"
             type="date"
             value={adminResDate}
             onChange={(e) => setAdminResDate(e.target.value)}
             required
           />
           <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-sub ml-1">불가피한 점유 시간대</label>
              <select 
                value={adminResTime} 
                onChange={(e) => setAdminResTime(e.target.value)}
                className="w-full bg-bg-main border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
              >
                {Array.from({ length: 14 }, (_, i) => i + 9).map(h => {
                  const val = `${String(h).padStart(2, '0')}:00`;
                  return (
                    <option key={h} value={val}>
                      {h}:00 ~ {h}:50
                    </option>
                  );
                })}
              </select>
           </div>
           <Input 
             label="점유 사유 (사용자 노출)"
             type="text"
             value={adminResDesc}
             onChange={(e) => setAdminResDesc(e.target.value)}
             placeholder="예: 서버 정기 점검"
             required
           />
           <div className="flex gap-2 pt-4">
             <Button type="button" variant="ghost" fullWidth onClick={() => setIsAdminResModalOpen(false)}>취소</Button>
             <Button type="submit" fullWidth>예약 생성</Button>
           </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
