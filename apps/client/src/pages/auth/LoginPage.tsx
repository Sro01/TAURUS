

import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AuthForm from '../../components/domain/auth/AuthForm';
import { PageContainer, PageTitle } from '../../components/common';
import { authService, adminService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';

import { ROUTES } from '../../constants/routes';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { loginTeam, loginAdmin } = useAuth();
  
  const initialRole = searchParams.get('role') === 'ADMIN' ? 'ADMIN' : 'TEAM';
  const from = location.state?.from?.pathname || (initialRole === 'ADMIN' ? ROUTES.ADMIN : ROUTES.TEAMS_ME);

  const handleSubmit = async (name: string, password: string) => {
    try {
      if (initialRole === 'ADMIN') {
        const { access_token } = await adminService.verify(password);
        loginAdmin(access_token);
      } else {
        const { access_token } = await authService.verify({ name, password });
        loginTeam(access_token, name, password);
      }
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error);
      const message = (error as any).response?.data?.message || '로그인에 실패했습니다.';
      alert(message);
    }
  };

  return (
    <PageContainer>
      <PageTitle title={initialRole === 'ADMIN' ? '관리자 로그인' : '팀 로그인'} />
      <div className="max-w-md mx-auto mt-10 p-6 bg-bg-card rounded-2xl border border-white/10 shadow-xl">
        <AuthForm
          onSubmit={handleSubmit}
          submitLabel="로그인"
          hideNameField={initialRole === 'ADMIN'}
        />
      </div>
    </PageContainer>
  );
}
