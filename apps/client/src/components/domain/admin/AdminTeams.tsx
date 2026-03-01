import { useState, useEffect, useCallback } from 'react';
import dayjs from '../../../utils/dayjs';
import { adminService, teamService } from '../../../services';
import { Input, Checkbox, ListRow } from '../../common';
import ReservationList from '../team/ReservationList';
import { BulkActionBar } from '../../common';
import { Users as UsersIcon } from 'lucide-react';
import { Team } from '../../../types/team';
import { Reservation } from '../../../types/reservation';

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamReservations, setSelectedTeamReservations] = useState<Reservation[]>([]);
  const [isTeamResLoading, setIsTeamResLoading] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedResIds, setSelectedResIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`선택한 ${selectedTeamIds.length}개의 팀을 정말 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(selectedTeamIds.map(id => adminService.deleteTeam(id)));
      loadTeams();
      setSelectedTeamIds([]);
      if (selectedTeam && selectedTeamIds.includes(selectedTeam.id)) {
        setSelectedTeam(null);
      }
      alert('일괄 삭제가 완료되었습니다.');
    } catch (error) {
      console.error(error);
      alert('일부 팀 삭제에 실패했습니다.');
    }
  };

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
    setSelectedResIds([]); // 팀 변경 시 예약 선택 초기화
    loadTeamReservations(team.id);
  };

  /** 예약 취소 핸들러 (단건 — ReservationList의 일괄 취소에서도 사용) */
  const handleCancelReservation = async (id: string) => {
    try {
      await adminService.cancelReservation(id);
      if (selectedTeam) loadTeamReservations(selectedTeam.id);
    } catch (error: any) {
      console.error(error);
      const statusCode = error.response?.status || 500;
      throw new Error(String(statusCode)); // ReservationList 내부 일괄 취소에서 에러 전파
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 팀 목록 리스트 (좌측) */}
      <div className="lg:col-span-5 space-y-4 relative">
        <div className="relative">
          <Input 
            placeholder="팀 이름 검색..." 
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            className="pl-4"
          />
        </div>

        <div className="flex items-center gap-2 px-2">
            <Checkbox 
                checked={selectedTeamIds.length === teams.length && teams.length > 0}
                onChange={(e) => {
                if (e.target.checked) {
                    setSelectedTeamIds(teams.map(t => t.id));
                } else {
                    setSelectedTeamIds([]);
                }
                }}
                label="전체 선택"
                className="text-sm text-text-sub"
            />
        </div>
        
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {teams.map(team => {
            const isSelected = selectedTeamIds.includes(team.id);
            const isActive = selectedTeam?.id === team.id;

            return (
              <ListRow 
                key={team.id}
                onClick={() => handleTeamClick(team)}
                className={`cursor-pointer transition-all ${
                  isActive ? 'bg-primary/10 border-primary' : ''
                } ${isSelected ? 'bg-primary/5' : ''}`}
                left={
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={isSelected}
                      onChange={() => toggleSelection(team.id)}
                    />
                  </div>
                }
                center={
                  <div>
                    <h4 className={`font-bold text-lg ${isActive ? 'text-primary' : 'text-text-main'}`}>
                      {team.name}
                    </h4>
                  </div>
                }
                right={
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-text-sub font-mono">{dayjs(team.createdAt).format('YYYY-MM-DD HH:mm')}</p>
                  </div>
                }
              />
            );
          })}
          {teams.length === 0 && (
            <div className="text-center py-20 text-text-sub bg-bg-card/30 rounded-2xl border border-dashed border-white/5">
              검색 결과가 없습니다.
            </div>
          )}
        </div>

        <BulkActionBar 
          selectedCount={selectedTeamIds.length}
          onClear={() => setSelectedTeamIds([])}
          onDelete={selectedTeamIds.length > 0 ? handleBulkDelete : undefined}
        />
      </div>

      {/* 팀 상세 및 예약 이력 (우측) */}
      <div className="lg:col-span-7">
        {selectedTeam ? (
          <div className="bg-bg-card rounded-2xl border border-white/10 p-4 sticky top-24 animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{selectedTeam.name}</h3>
                <p className="text-sm text-text-sub">등록일: {dayjs(selectedTeam.createdAt).format('YYYY-MM-DD HH:mm')}</p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <ReservationList 
                reservations={selectedTeamReservations}
                loading={isTeamResLoading}
                onCancel={handleCancelReservation}
                selectable
                selectedIds={selectedResIds}
                onSelectionChange={setSelectedResIds}
                showHeader={false}
              />
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
