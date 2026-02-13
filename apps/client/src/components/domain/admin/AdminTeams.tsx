import { useState, useEffect, useCallback } from 'react';
import dayjs from '../../../utils/dayjs';
import { adminService, teamService } from '../../../services';
import { Input } from '../../common';
import { Trash2, Users as UsersIcon, Clock } from 'lucide-react';
import { Team } from '../../../types/team';
import { Reservation } from '../../../types/reservation';

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamReservations, setSelectedTeamReservations] = useState<Reservation[]>([]);
  const [isTeamResLoading, setIsTeamResLoading] = useState(false);

  const loadTeams = useCallback(async () => {
    try {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTeams();
    }, 300);
    return () => clearTimeout(timer);
  }, [teamSearch, loadTeams]);

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    loadTeamReservations(team.id);
  };

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
      if (selectedTeam) loadTeamReservations(selectedTeam.id);
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || '예약 취소 실패';
      alert(`오류 발생: ${message}`);
    }
  };

  return (
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
                  className="p-2 text-text-sub hover:text-error bg-white/5 hover:bg-error/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
  );
}
