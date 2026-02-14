import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services';
import { useAuth } from '../hooks';

export type AdminTab = 'reservations' | 'settings' | 'teams';

export function useAdminPage() {
    const navigate = useNavigate();
    const { isAdminAuthenticated, loginAdmin, logoutAdmin } = useAuth();

    // 상태
    const [activeTab, setActiveTab] = useState<AdminTab>('reservations');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(!isAdminAuthenticated);

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
    };

    const handleNavigateHome = () => {
        navigate('/');
    };

    return {
        activeTab,
        setActiveTab,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isAdminAuthenticated,
        handleAuthSubmit,
        handleLogout,
        handleNavigateHome,
    };
}
