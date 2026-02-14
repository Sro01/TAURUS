import { useState } from 'react';
import { useTeamPage } from '../../hooks/useTeamPage';
import { PageContainer, SectionHeader, Text, Button, Modal, Input } from '../../components/common';
import ReservationList from '../../components/domain/team/ReservationList';
import DangerZone from '../../components/domain/team/DangerZone';
import { teamService } from '../../services';
import dayjs from 'dayjs';

export default function TeamDetailPage() {
  const {
    myTeam,
    myReservations,
    loading,
    isDeleting,
    fetchMyTeam,
    handleCancelReservation,
    handleDeleteTeam,
    handleLogout,
  } = useTeamPage();

  // Logic migrated from TeamInfoCard
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'name' | 'password'>('name');
  const [editValue, setEditValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditModal = (mode: 'name' | 'password') => {
    setEditMode(mode);
    setEditValue('');
    setCurrentPassword(''); // Auto-fill constraint: If browser auto-fills, it will be handled by Input's native behavior or user intraction. 
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editMode === 'name') {
        await teamService.updateName(editValue);
        alert('팀 이름이 변경되었습니다.');
      } else { // password
        if (!currentPassword) {
            alert('현재 비밀번호를 입력해주세요.');
            return;
        }
        await teamService.updatePassword(currentPassword, editValue);
        alert('비밀번호가 변경되었습니다.');
      }
      setIsEditModalOpen(false);
      fetchMyTeam();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || '수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-text-sub">로딩 중...</div>;
  if (!myTeam) return null; // Or redirect handled by auth guard

  return (
    <PageContainer>
      {/* 1. Header & Logout */}
      <SectionHeader 
        title="팀 관리"
        description="팀 이름 및 비밀번호 변경"
        action={
          <Button variant="outline" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        }
      />

      <div className="space-y-12">
        {/* 2. Settings Section */}
        <section>
          <div className="bg-surface rounded-xl border border-border p-4">
              <div className="flex flex-col justify-between gap-2">
                <Text variant="subtitle">{myTeam.name}</Text>
                {/* YY-MM-DD HH:MM:SS */}
                <Text variant="caption">등록일: {dayjs(myTeam.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>

                <div className="flex items-center justify-end gap-4 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openEditModal('name')}>이름 변경</Button>
                  <Button variant="outline" size="sm" onClick={() => openEditModal('password')}>비밀번호 변경</Button>
                </div>
              </div>
          </div>
        </section>

        {/* 3. Reservation History */}
        <ReservationList 
          reservations={myReservations} 
          loading={loading} 
          onCancel={handleCancelReservation} 
        />

        {/* 4. Danger Zone */}
        <DangerZone 
          onDelete={handleDeleteTeam} 
          isDeleting={isDeleting} 
        />
      </div>

      {/* Edit Modal (Migrated) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editMode === 'name' ? '팀 이름 변경' : '비밀번호 변경'}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editMode === 'password' && (
            <Input 
                label="현재 비밀번호"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="현재 비밀번호를 입력하세요"
            />
          )}
          <Input 
            label={editMode === 'name' ? '새로운 팀 이름' : '새로운 비밀번호'}
            type={editMode === 'name' ? 'text' : 'password'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            required
            placeholder={editMode === 'name' ? '변경할 팀 이름을 입력하세요' : '새로운 비밀번호 4자리'}
            maxLength={editMode === 'password' ? 4 : undefined}
          />
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="ghost" fullWidth onClick={() => setIsEditModalOpen(false)}>취소</Button>
            <Button type="submit" fullWidth disabled={isSubmitting}>
              {editMode === 'name' ? '변경' : '저장'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
