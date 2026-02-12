import dayjs from '../../../utils/dayjs';
import { Week } from '../../../types';

interface WeekSelectorProps {
  currentWeek: Week | null;
  selectedDate: dayjs.Dayjs;
  onSelectDate: (date: dayjs.Dayjs) => void;
}

export default function WeekSelector({ currentWeek, selectedDate, onSelectDate }: WeekSelectorProps) {
  if (!currentWeek) return null;

  const start = dayjs(currentWeek.startDate);
  // 월~일 7일 생성
  const days = Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));

  return (
    <div className="flex justify-between items-center bg-bg-card rounded-xl p-2 mb-6 border border-white/5">
      {days.map((date) => {
        const isSelected = date.isSame(selectedDate, 'day');
        const isToday = date.isSame(dayjs(), 'day');
        
        return (
          <button
            key={date.toISOString()}
            onClick={() => onSelectDate(date)}
            className={`flex flex-col items-center justify-center w-full py-2 rounded-lg transition-all ${
              isSelected 
                ? 'bg-primary text-white shadow-lg' 
                : 'text-text-sub hover:bg-white/5'
            }`}
          >
            <span className={`text-xs mb-1 ${isSelected ? 'text-white/80' : ''}`}>
              {date.format('ddd')}
            </span>
            <span className={`text-lg font-bold ${isToday && !isSelected ? 'text-primary' : ''}`}>
              {date.format('D')}
            </span>
            {isToday && (
              <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-primary'}`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
