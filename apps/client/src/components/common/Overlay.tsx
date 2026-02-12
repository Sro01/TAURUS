interface OverlayProps {
  onClose: () => void;
}

/** 공용 오버레이 — 모달/드로어 뒤 어두운 배경 */
export default function Overlay({ onClose }: OverlayProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-40"
      onClick={onClose}
    />
  );
}
