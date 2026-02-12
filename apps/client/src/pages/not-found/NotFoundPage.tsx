import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <h2 className="text-6xl font-bold text-primary">404</h2>
      <p className="text-text-sub">페이지를 찾을 수 없습니다.</p>
      <Button onClick={() => navigate('/')} className="mt-4">
        홈으로 돌아가기
      </Button>
    </div>
  );
}
