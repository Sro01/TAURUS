import { useState } from 'react';
import dayjs from '../../utils/dayjs';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

interface MultiDatePickerProps {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}

export default function MultiDatePicker({ selectedDates, onChange }: MultiDatePickerProps) {
  const [currentDate, setCurrentDate] = useState(dayjs());

  const startOfMonth = currentDate.startOf('month');
  const startDay = startOfMonth.day(); // 0 (Sun) ~ 6 (Sat)
  const daysInMonth = currentDate.daysInMonth();

  const currentYear = dayjs().year();
  const isPrevDisabled = currentDate.year() === currentYear && currentDate.month() === 0;
  const isNextDisabled = currentDate.year() === currentYear && currentDate.month() === 11;

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    setCurrentDate(prev => prev.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    setCurrentDate(prev => prev.add(1, 'month'));
  };

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      onChange(selectedDates.filter(d => d !== dateStr));
    } else {
      onChange([...selectedDates, dateStr].sort());
    }
  };

  // Generate calendar grid
  const renderCalendar = () => {
    const days = [];
    
    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-prev-${i}`} />);
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = startOfMonth.date(i);
      const dateStr = date.format('YYYY-MM-DD');
      const isSelected = selectedDates.includes(dateStr);
      const isToday = date.isSame(dayjs(), 'day');

      days.push(
        <button
          key={dateStr}
          type="button"
          onClick={() => toggleDate(dateStr)}
          className={`
            relative h-10 w-10 rounded-full text-md font-medium transition-all flex items-center justify-center
            ${isSelected 
              ? 'bg-brand-red text-white shadow-lg shadow-brand-red/30' 
              : 'text-text-main hover:bg-white/10'
            }
          `}
        >
          {i}
          {isToday && (
            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-brand-red"/>
          )}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="py-2 bg-surface w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          type="button" 
          onClick={handlePrevMonth}
          disabled={isPrevDisabled}
          className={`
            p-2 rounded-lg transition-colors
            ${isPrevDisabled 
              ? 'text-white/10 cursor-not-allowed' 
              : 'text-text-sub hover:text-white hover:bg-white/10'
            }
          `}
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <span className="text-lg font-bold text-text-main">
          {currentDate.format('YYYY년 M월')}
        </span>
        <button 
          type="button" 
          onClick={handleNextMonth}
          disabled={isNextDisabled}
          className={`
            p-2 rounded-lg transition-colors
            ${isNextDisabled 
              ? 'text-white/10 cursor-not-allowed' 
              : 'text-text-sub hover:text-white hover:bg-white/10'
            }
          `}
        >
          <CaretRight size={20} weight="bold" />
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 mb-2 text-center">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <span 
            key={day} 
            className={`text-sm font-medium text-text-sub`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 justify-items-center">
        {renderCalendar()}
      </div>
    </div>
  );
}
