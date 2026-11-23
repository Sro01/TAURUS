import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Settings, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AvailabilityGrid from '@/components/domain/jam/AvailabilityGrid';
import JamLoginForm from '@/components/domain/jam/JamLoginForm';
import JamRoomCellSheet from '@/components/domain/jam/JamRoomCellSheet';
import JamRoomSettings from '@/components/domain/jam/JamRoomSettings';
import JamRoomWeekTabs from '@/components/domain/jam/JamRoomWeekTabs';
import JamShareSheet from '@/components/domain/jam/JamShareSheet';
import PaintGrid from '@/components/domain/jam/PaintGrid';
import PeopleChips from '@/components/domain/jam/PeopleChips';
import PriorityList from '@/components/domain/jam/PriorityList';
import { defaultWeekIndex, rangeLabel, weekTabLabels, whenLabel } from '@/components/domain/jam/JamRoomFormat';
import ReservationModal from '@/components/domain/reservation/ReservationModal';
import { jamRoomPath, ROUTES } from '@/constants/routes';
import { useJamBooking, useJamRoom } from '@/hooks/useJamRoom';
import { getJamErrorMessage } from '@/services/jamApi';
import type { SlotRef, UpdateJamRoomInput } from '@/types/jam';
import { availableAt } from '@/utils/jam/heatmap';
import { buildBlocked, buildPendingCounts } from '@/utils/jam/blocked';
import { countOnSlots, dayDate, indexToHour, reservationKindOf, todayKst } from '@/utils/jam/slots';

type Step = 'room' | 'login' | 'paint' | 'priority';

const TOAST_MS = 2800;

// 방 (스펙 5.1~5.4, 시안 3~7). 한 페이지 안에서 단계를 바꿔 보여 준다:
// 방(참여 현황 + 모두의 시간) → 이름·비밀번호 → 내 시간 칠하기 → 우선순위 → 예약 모달
export default function JamRoomPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const jam = useJamRoom(slug);
  const { room, status, weeks, reservations, now, me } = jam;

  const [step, setStep] = useState<Step>('room');
  const [weekChoice, setWeekChoice] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<SlotRef | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  // 방을 막 만들고 왔으면(라우터 state) 링크 공유 시트를 한 번 연다
  const [shareOpen, setShareOpen] = useState(
    () => (location.state as { justCreated?: boolean } | null)?.justCreated === true,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // 새로고침·뒤로 가기로 시트가 다시 뜨지 않게 state를 비운다
  useEffect(() => {
    if ((location.state as { justCreated?: boolean } | null)?.justCreated) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const booking = useJamBooking(jam, notify);

  const blocked = useMemo(() => (room ? buildBlocked(room, reservations, now) : null), [room, reservations, now]);
  const pending = useMemo(() => (room ? buildPendingCounts(room, reservations) : null), [room, reservations]);

  if (status === 'loading' || (status === 'ready' && (!room || !blocked || !pending))) {
    return <p className="py-16 text-center text-sm text-muted-foreground">방을 불러오는 중이에요</p>;
  }

  if (status === 'notFound') {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-[15px] text-muted-foreground">방을 찾을 수 없어요</p>
        <Button asChild className="h-11 rounded-xl px-5 font-bold">
          <Link to={ROUTES.JAM_CREATE}>새 방 만들기</Link>
        </Button>
      </div>
    );
  }

  if (status === 'error' || !room || !blocked || !pending) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-[15px] text-muted-foreground">{jam.errorMessage ?? '방을 불러오지 못했어요'}</p>
        <Button type="button" className="h-11 rounded-xl px-5 font-bold" onClick={() => void jam.refresh()}>
          다시 불러오기
        </Button>
      </div>
    );
  }

  // 출입증이 사라졌거나(만료·빠짐) 끝난 방이면 칠하기·들어오기 단계에 머물 수 없다
  const view: Step = room.ended && (step === 'paint' || step === 'login') ? 'room' : step === 'paint' && !me ? 'login' : step;

  const today = todayKst();
  const weekIndex = weekChoice ?? defaultWeekIndex(room);
  const weekLabels = weekTabLabels(room, weeks);
  const rangeText = rangeLabel(room, weeks);

  const openMine = () => {
    if (room.ended) return;
    if (me) {
      setStep('paint');
    } else {
      jam.clearEnterError();
      setStep('login');
    }
  };

  const handleEnter = async (name: string, pin: string) => {
    if (await jam.enter(name, pin)) setStep('paint');
  };

  const handleSaveSlots = async (slots: number[]) => {
    const first = !me || countOnSlots(me.slots) === 0;
    setSaving(true);
    try {
      await jam.saveMySlots({ slots });
      setStep('room');
      notify(first ? '내 시간을 등록했어요' : '내 시간을 고쳤어요');
    } catch (error) {
      notify(getJamErrorMessage(error, '등록하지 못했어요. 다시 눌러 주세요'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRoom = async (input: UpdateJamRoomInput) => {
    await jam.updateRoom(input);
    notify('방 설정을 바꿨어요');
  };

  const handleLeave = async () => {
    await jam.leave();
    setStep('room');
    setFocusId(null);
    notify('방에서 빠졌어요');
  };

  const toggleCell = (ref: SlotRef) =>
    setSelectedCell((prev) => (prev?.dayIndex === ref.dayIndex && prev.hourIndex === ref.hourIndex ? null : ref));

  // 칸 상세 시트 (지난 칸·마감 칸이 되면 닫는다)
  const sheetCell =
    view === 'room' && selectedCell && blocked[selectedCell.dayIndex]?.[selectedCell.hourIndex] === null
      ? selectedCell
      : null;
  const sheetDate = sheetCell ? dayDate(room.startDate, sheetCell.dayIndex) : null;
  const sheetAvailable = sheetCell ? availableAt(room.participants, sheetCell) : [];

  const backBar = (
    <div className="mb-3 grid grid-cols-[44px_1fr_44px] items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="뒤로"
        className="-ml-2 size-11"
        onClick={() => setStep('room')}
      >
        <ChevronLeft className="size-6" aria-hidden="true" />
      </Button>
      <span className="truncate text-center text-base font-bold">{room.title}</span>
    </div>
  );

  const focusName = room.participants.find((p) => p.id === focusId)?.name ?? null;

  return (
    <div className="pt-4">
      {view === 'room' && (
        <div className="flex flex-col gap-4 pb-28">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="truncate text-xl font-extrabold">{room.title}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[13px] text-muted-foreground">{rangeText}</span>
                {room.ended && <Badge variant="secondary">끝난 방</Badge>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              {me && !room.ended && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="방 설정"
                  className="size-11 rounded-xl border-border bg-card"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="size-5" aria-hidden="true" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="링크 공유"
                className="size-11 rounded-xl border-border bg-card"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="size-5" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <PeopleChips
            participants={room.participants}
            headcount={room.headcount}
            myId={me?.id ?? null}
            selectedId={focusId}
            onSelect={setFocusId}
          />

          <section className="flex flex-col gap-2.5">
            <h2 className="text-base font-extrabold">{focusName ? `${focusName} 님의 시간` : '모두의 시간'}</h2>
            {weekLabels.length > 1 && <JamRoomWeekTabs labels={weekLabels} value={weekIndex} onChange={setWeekChoice} />}
            <AvailabilityGrid
              startDate={room.startDate}
              participants={room.participants}
              weekIndex={weekIndex}
              blocked={blocked}
              pending={pending}
              focusId={focusId}
              selected={sheetCell}
              today={today}
              onSelect={toggleCell}
            />
            <p className="text-center text-[13px] text-[#8b8b93]">칸을 누르면 누가 되는지 보여요</p>
          </section>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1f1f23] bg-background">
            <div className={`mx-auto grid max-w-[600px] gap-2 p-4 ${room.ended ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {!room.ended && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-[52px] rounded-xl border-primary bg-transparent text-[15px] font-bold text-[#fca5a5] hover:bg-primary/10"
                  onClick={openMine}
                >
                  {me ? '내 시간 고치기' : '내 시간 등록'}
                </Button>
              )}
              <Button
                type="button"
                className="h-[52px] rounded-xl text-[15px] font-bold"
                onClick={() => {
                  setSelectedCell(null);
                  setStep('priority');
                }}
              >
                우선순위 보기
              </Button>
            </div>
          </div>

          {sheetCell && sheetDate && (
            <JamRoomCellSheet
              when={whenLabel(sheetDate, indexToHour(sheetCell.hourIndex))}
              available={sheetAvailable}
              unavailable={room.participants.filter((p) => !sheetAvailable.includes(p))}
              waiting={pending[sheetCell.dayIndex]?.[sheetCell.hourIndex] ?? 0}
              kind={room.ended || !weeks ? 'none' : reservationKindOf(sheetDate, weeks)}
              onClose={() => setSelectedCell(null)}
              onBook={() => {
                setSelectedCell(null);
                void booking.start(sheetCell);
              }}
            />
          )}

          <JamShareSheet
            open={shareOpen}
            url={`${window.location.origin}${jamRoomPath(room.slug)}`}
            onClose={() => setShareOpen(false)}
            onCopied={() => {
              setShareOpen(false);
              notify('링크를 복사했어요');
            }}
          />
          {me && !room.ended && (
            <JamRoomSettings
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              room={room}
              onSave={handleUpdateRoom}
              onLeave={handleLeave}
            />
          )}
        </div>
      )}

      {view === 'login' && (
        <JamLoginForm
          onSubmit={handleEnter}
          submitting={jam.entering}
          errorMessage={jam.enterError}
          onCancel={() => {
            jam.clearEnterError();
            setStep('room');
          }}
        />
      )}

      {view === 'paint' && me && (
        <>
          {backBar}
          <PaintGrid
            name={me.name}
            startDate={room.startDate}
            initialSlots={me.slots}
            blocked={blocked}
            weekIndex={weekIndex}
            weekLabels={weekLabels}
            rangeText={rangeText}
            onWeekChange={setWeekChoice}
            today={today}
            saving={saving}
            onSave={handleSaveSlots}
          />
        </>
      )}

      {view === 'priority' && (
        <>
          {backBar}
          <PriorityList
            room={room}
            blocked={blocked}
            pending={pending}
            weeks={weeks}
            canRegister={!room.ended}
            onBook={(ref) => void booking.start(ref)}
            onRegister={openMine}
          />
        </>
      )}

      <ReservationModal {...booking.modalProps} />

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 top-[68px] z-[100] mx-auto max-w-[568px] rounded-xl bg-foreground px-4 py-3 text-center text-sm font-bold text-background"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
