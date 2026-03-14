import { createPortal } from 'react-dom';
import { InlineAlert } from '../../common';

interface HomeNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HomeNoticeModal({ isOpen, onClose }: HomeNoticeModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ zIndex: 9999 }}
    >
      {/* 반투명 배경 — 터치/클릭 시 닫힘 */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* InlineAlert 본체 */}
      <div className="relative w-full max-w-sm">
        <InlineAlert variant="info" title="베타 테스트 안내">
          <div className="space-y-1 text-white/90">
            <p>• 현재 베타 테스트 단계이며, 시스템 상황에 따라 테스트 기간이 연장될 수 있습니다. (2026.03.15 ~ 2026.04.15)</p>
            <p>• 토러스에 대한 애정으로 1인 개발한 시스템이니 너그러운 마음으로 이용해 주시면 감사하겠습니다.</p>
            <p>• 시스템 관련 피드백 및 버그 제보는 아래 오픈 채팅방으로 문의 주시면 감사하겠습니다.</p>
            <p>
              <a
                href="https://open.kakao.com/o/suXRhsli"
                className="text-blue-400 underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                https://open.kakao.com/o/suXRhsli
              </a>
            </p>
          </div>
          <button
            className="mt-4 w-full py-2 rounded-lg bg-status-info/20 border border-status-info/30 text-status-info text-sm font-semibold hover:bg-status-info/30 transition-colors"
            onClick={onClose}
          >
            확인
          </button>
        </InlineAlert>
      </div>
    </div>,
    document.body
  );
}
