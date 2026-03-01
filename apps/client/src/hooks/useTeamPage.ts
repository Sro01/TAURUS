import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeam, useReservation, useAuth } from '../hooks';

export function useTeamPage() {
    const navigate = useNavigate();
    const { logoutTeam } = useAuth();

    // 훅
    const { myTeam, loading: teamLoading, fetchMyTeam, deleteTeam } = useTeam();
    const { myReservations, loading: resLoading, getMyReservations, cancelReservation } = useReservation();

    // 상태
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedResIds, setSelectedResIds] = useState<string[]>([]);

    // 데이터 로드
    useEffect(() => {
        fetchMyTeam();
        getMyReservations();
    }, [fetchMyTeam, getMyReservations]);

    // 예약 취소 핸들러 (단건)
    const handleCancelReservation = useCallback(async (id: string) => {
        try {
            await cancelReservation(id);
            getMyReservations();
        } catch (error: any) {
            console.error(error);
            const statusCode = error.response?.status || 500;
            throw new Error(String(statusCode)); // ReservationList의 단건/일괄 취소에서 에러 전파
        }
    }, [cancelReservation, getMyReservations]);

    // 팀 탈퇴 핸들러
    const handleDeleteTeam = useCallback(async () => {
        if (!confirm('정말로 팀을 삭제하시겠습니까? 예약된 내역도 모두 삭제됩니다.')) return;
        try {
            setIsDeleting(true);
            await deleteTeam();
            logoutTeam();
            alert('팀이 삭제되었습니다.');
            navigate('/');
        } catch (error) {
            console.error(error);
            alert('팀 삭제에 실패했습니다.');
        } finally {
            setIsDeleting(false);
        }
    }, [deleteTeam, logoutTeam, navigate]);

    // 로그아웃 핸들러
    const handleLogout = useCallback(() => {
        logoutTeam();
        navigate('/');
    }, [logoutTeam, navigate]);

    const handleNavigateHome = useCallback(() => {
        navigate('/');
    }, [navigate]);

    return {
        myTeam,
        myReservations,
        loading: teamLoading || resLoading,
        isDeleting,
        selectedResIds,
        setSelectedResIds,
        fetchMyTeam,
        handleCancelReservation,
        handleDeleteTeam,
        handleLogout,
        handleNavigateHome,
    };
}
