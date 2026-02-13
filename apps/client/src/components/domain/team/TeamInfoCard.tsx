import { useState } from 'react';
import { Card, Button, Input, Modal } from '../../common';
import { Team } from '../../../types/team';
import dayjs from '../../../utils/dayjs';
import { teamService } from '../../../services';

interface TeamInfoCardProps {
  team: Team;
  onLogout: () => void;
  onUpdate: () => void;
}

export default function TeamInfoCard({ team, onLogout, onUpdate }: TeamInfoCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'name' | 'password'>('name');
  const [editValue, setEditValue] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditModal = (mode: 'name' | 'password') => {
    setEditMode(mode);
    setEditValue('');
    setCurrentPassword('');
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
      onUpdate();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || '수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="p-6 mb-8 border-primary/20 bg-bg-card/80">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm text-text-sub mb-1">Team</h3>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-3xl font-bold text-primary">{team.name}</h2>
              <button 
                onClick={() => openEditModal('name')}
                className="text-xs text-text-sub hover:text-white underline"
              >
                수정
              </button>
            </div>
            
            <div className="flex gap-4 text-xs text-text-sub">
               <span>가입일: {dayjs(team.createdAt).format('YYYY.MM.DD')}</span>
               <button 
                  onClick={() => openEditModal('password')}
                  className="hover:text-white underline"
                >
                  비밀번호 변경
                </button>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout} className="text-xs py-1 px-3 h-auto">
            로그아웃
          </Button>
        </div>
      </Card>

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
    </>
  );
}
