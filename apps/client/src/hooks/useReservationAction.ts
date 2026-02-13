import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, reservationService } from '../services'; // reservationService includes createPre/createInstant
import { useAuth } from '../hooks'; // Import from hooks index or direct context

type ReservationType = 'PRE' | 'INSTANT';

interface UseReservationActionProps {
    type: ReservationType;
    onSuccess?: () => void;
}

export function useReservationAction({ type, onSuccess }: UseReservationActionProps) {
    const navigate = useNavigate();
    const { loginTeam } = useAuth(); // Use loginTeam instead of login
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [pendingReservation, setPendingReservation] = useState<{
        startTime: string;
        endTime: string;
    } | null>(null);

    // 1. 예약 버튼 클릭 시 호출 (인증 확인)
    const initiateReservation = (startTime: string, endTime: string) => {
        setPendingReservation({ startTime, endTime });
        setIsAuthModalOpen(true);
    };

    // 2. 인증 모달 제출 시 호출
    const handleAuthSubmit = async (teamName: string, password: string) => {
        if (!pendingReservation) return;

        try {
            // 1. 인증 -> returns { access_token, isNewTeam }
            const { access_token } = await authService.verify({ name: teamName, password });

            // 2. 로그인 상태 업데이트 (Team Context)
            loginTeam(access_token, teamName, password);

            // 3. 예약 생성
            if (type === 'PRE') {
                await reservationService.createPre({
                    startTime: pendingReservation.startTime,
                });
                alert(`${teamName} 팀의 사전 예약 신청이 완료되었습니다.`);
            } else {
                await reservationService.createInstant({
                    startTime: pendingReservation.startTime,
                });
                alert(`${teamName} 팀의 즉시 예약이 확정되었습니다.`);
            }

            setIsAuthModalOpen(false);
            setPendingReservation(null);
            if (onSuccess) onSuccess();

            // 예약 후 팀 페이지로 이동 (선택적)
            navigate('/teams/me');

        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || '예약 처리에 실패했습니다.';
            alert(`오류: ${message}`);
        }
    };

    return {
        isAuthModalOpen,
        setIsAuthModalOpen,
        initiateReservation,
        handleAuthSubmit,
        closeModal: () => {
            setIsAuthModalOpen(false);
            setPendingReservation(null);
        }
    };
}
