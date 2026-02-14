import { useState } from 'react';
import { authService, reservationService } from '../services';
import { useAuth } from '../hooks';

type ReservationType = 'PRE' | 'INSTANT';

interface UseReservationActionProps {
    type: ReservationType;
    onSuccess?: () => void;
}

export function useReservationAction({ type, onSuccess }: UseReservationActionProps) {
    const { loginTeam } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [pendingReservation, setPendingReservation] = useState<{
        startTime: string;
    } | null>(null);

    // 1. 예약 버튼 클릭 시 호출 (인증 확인을 위한 모달 오픈)
    const initiateReservation = (startTime: string) => {
        setPendingReservation({ startTime });
        setIsAuthModalOpen(true);
    };

    // 2. 인증 모달 제출 시 호출
    const handleAuthSubmit = async (teamName: string, password: string) => {
        if (!pendingReservation) return;

        try {
            // 1. 인증 -> returns { access_token, isNewTeam }
            // autoRegister: true 옵션 추가 (페이지 로직과 동일하게)
            const res = await authService.verify({
                name: teamName,
                password,
                autoRegister: true
            }) as { access_token: string, isNewTeam?: boolean };

            const { access_token, isNewTeam } = res;

            // 2. 로그인 상태 업데이트
            loginTeam(access_token, teamName, password);

            if (isNewTeam) alert('팀 등록이 완료되었습니다!');

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
        },
        pendingReservation
    };
}
