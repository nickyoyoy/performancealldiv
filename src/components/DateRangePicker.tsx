import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DatePreset } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  RotateCcw,
  X,
} from 'lucide-react';
import { formatDateWIB } from '../utils/formatters';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  datePreset?: DatePreset;
  availableDates: string[];
  activeDateRangeText?: string;
  onApply: (start?: string, end?: string, preset?: DatePreset) => void;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  datePreset = 'prev_month',
  availableDates,
  activeDateRangeText = 'Oktober 2026',
  onApply,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Temporary selection state inside the popup
  const [tempStart, setTempStart] = useState<string | null>(startDate || null);
  const [tempEnd, setTempEnd] = useState<string | null>(endDate || null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tempPreset, setTempPreset] = useState<DatePreset>(datePreset);

  // Calendar month view (defaults to latest available date or current October/November 2026)
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(9); // 0-indexed: 9 = October

  // Initialize view month based on available dates or current selection
  useEffect(() => {
    if (startDate) {
      const [y, m] = startDate.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
      setTempStart(startDate);
      setTempEnd(endDate || startDate);
    } else if (availableDates.length > 0) {
      const latest = availableDates[availableDates.length - 1];
      const [y, m] = latest.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
    setTempPreset(datePreset);
  }, [startDate, endDate, datePreset, availableDates]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Set of dates that actually have data
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  // Calendar grid calculation for viewYear and viewMonth
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      hasData: boolean;
    }> = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({
        dateStr: '',
        dayNumber: 0,
        isCurrentMonth: false,
        hasData: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${viewYear}-${mm}-${dd}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        hasData: availableSet.has(dateStr),
      });
    }

    return days;
  }, [viewYear, viewMonth, availableSet]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Date click handler in calendar grid
  const handleDateClick = (dateStr: string) => {
    if (!dateStr) return;

    setTempPreset('custom');

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd(null);
      return;
    }

    if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setTempEnd(null);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  // Quick preset selector
  const handleSelectPreset = (preset: DatePreset) => {
    setTempPreset(preset);

    if (preset === 'all') {
      if (availableDates.length > 0) {
        setTempStart(availableDates[0]);
        setTempEnd(availableDates[availableDates.length - 1]);
        const [y, m] = availableDates[availableDates.length - 1]
          .split('-')
          .map(Number);
        setViewYear(y);
        setViewMonth(m - 1);
      } else {
        setTempStart(null);
        setTempEnd(null);
      }
    } else if (preset === '30d') {
      if (availableDates.length > 0) {
        const slice = availableDates.slice(-30);
        setTempStart(slice[0]);
        setTempEnd(slice[slice.length - 1]);
        const [y, m] = slice[slice.length - 1].split('-').map(Number);
        setViewYear(y);
        setViewMonth(m - 1);
      }
    } else if (preset === '7d') {
      if (availableDates.length > 0) {
        const slice = availableDates.slice(-7);
        setTempStart(slice[0]);
        setTempEnd(slice[slice.length - 1]);
        const [y, m] = slice[slice.length - 1].split('-').map(Number);
        setViewYear(y);
        setViewMonth(m - 1);
      }
    } else if (preset === 'mtd') {
      setTempStart('2026-11-01');
      setTempEnd('2026-11-18');
      setViewYear(2026);
      setViewMonth(10);
    } else if (preset === 'prev_month') {
      setTempStart('2026-10-01');
      setTempEnd('2026-10-31');
      setViewYear(2026);
      setViewMonth(9);
    }
  };

  // Apply changes to parent
  const handleApply = () => {
    if (tempPreset === 'custom') {
      const finalStart = tempStart || undefined;
      const finalEnd = tempEnd || tempStart || undefined;
      onApply(finalStart, finalEnd, 'custom');
    } else {
      let finalStart: string | undefined;
      let finalEnd: string | undefined;

      if (tempPreset === 'prev_month') {
        finalStart = '2026-10-01';
        finalEnd = '2026-10-31';
      } else if (tempPreset === 'mtd') {
        finalStart = '2026-11-01';
        finalEnd = '2026-11-18';
      } else if (tempPreset === '7d' && availableDates.length > 0) {
        const slice = availableDates.slice(-7);
        finalStart = slice[0];
        finalEnd = slice[slice.length - 1];
      } else if (tempPreset === '30d' && availableDates.length > 0) {
        const slice = availableDates.slice(-30);
        finalStart = slice[0];
        finalEnd = slice[slice.length - 1];
      } else if (tempPreset === 'all' && availableDates.length > 0) {
        finalStart = availableDates[0];
        finalEnd = availableDates[availableDates.length - 1];
      }

      onApply(finalStart, finalEnd, tempPreset);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    handleSelectPreset('prev_month');
  };

  // Helper to determine styling of each day in the calendar grid
  const getDayStyle = (dateStr: string) => {
    if (!dateStr) return '';

    const effectiveEnd =
      tempEnd ||
      (tempStart && hoveredDate && hoveredDate > tempStart
        ? hoveredDate
        : tempStart);

    const isStart = tempStart === dateStr;
    const isEnd = tempEnd === dateStr;
    const isInRange =
      tempStart &&
      effectiveEnd &&
      dateStr > tempStart &&
      dateStr < effectiveEnd;

    let classes =
      'relative flex items-center justify-center text-xs h-8 w-8 mx-auto transition-all cursor-pointer font-medium ';

    if (isStart || isEnd) {
      classes +=
        'bg-[#127a60] text-white font-bold rounded-lg shadow-xs hover:bg-[#0e634e] z-10 ';
    } else if (isInRange) {
      classes +=
        'bg-emerald-50 text-[#127a60] font-semibold hover:bg-emerald-100 ';
    } else {
      classes += 'text-slate-700 hover:bg-slate-100 rounded-lg ';
    }

    return classes;
  };

  // Professional date range label formatting
  const triggerLabel = useMemo(() => {
    if (datePreset === 'custom' && startDate && endDate) {
      if (startDate === endDate) return formatDateWIB(startDate);

      const [sY, sM, sD] = startDate.split('-');
      const [eY, eM, eD] = endDate.split('-');
      const sMonth = SHORT_MONTHS[parseInt(sM, 10) - 1] || sM;
      const eMonth = SHORT_MONTHS[parseInt(eM, 10) - 1] || eM;

      if (sY === eY && sM === eM) {
        return `${parseInt(sD, 10)} ${sMonth} – ${parseInt(eD, 10)} ${eMonth} ${eY}`;
      }
      if (sY === eY) {
        return `${parseInt(sD, 10)} ${sMonth} – ${parseInt(eD, 10)} ${eMonth} ${eY}`;
      }
      return `${formatDateWIB(startDate)} – ${formatDateWIB(endDate)}`;
    }
    if (datePreset === 'all') return `Semua (${availableDates.length} Hari)`;
    if (datePreset === '30d') return '30 Hari Terakhir';
    if (datePreset === '7d') return '7 Hari Terakhir';
    if (datePreset === 'mtd') return 'Bulan Ini (Nov 2026)';
    if (datePreset === 'prev_month') return 'Bulan Lalu (Okt 2026)';
    return activeDateRangeText;
  }, [datePreset, startDate, endDate, availableDates, activeDateRangeText]);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Input Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Pilih rentang tanggal dan periode Customer Happiness"
        aria-expanded={isOpen}
        className={`group inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-all shadow-2xs cursor-pointer ${
          isOpen
            ? 'bg-white text-[#127a60] border-[#127a60] ring-2 ring-[#127a60]/10'
            : datePreset === 'custom'
            ? 'bg-white text-[#127a60] border-[#127a60]/50 hover:border-[#127a60] hover:bg-emerald-50/30'
            : 'bg-white text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#127a60] transition-colors shrink-0" />
        <span className="font-sans font-semibold tracking-tight text-slate-800 truncate max-w-[220px]">
          {triggerLabel}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform shrink-0 ${
            isOpen ? 'rotate-180 text-[#127a60]' : ''
          }`}
        />
      </button>

      {/* Calendar Dropdown Modal / Popover */}
      {isOpen && (
        <div className="absolute left-0 lg:left-auto lg:right-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden w-[320px] sm:w-[560px] transition-all">
          {/* Header */}
          <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-[#127a60]">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 leading-none">
                  Pilih Rentang Periode Customer Happiness
                </h4>
                <p className="text-3xs text-slate-400 mt-1 font-medium">
                  {tempPreset === 'custom' && tempStart
                    ? `${tempStart} s/d ${tempEnd || tempStart}`
                    : 'Pilih preset cepat atau tentukan rentang kalender'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              aria-label="Tutup pemilih rentang tanggal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row">
            {/* Left Column: Preset Shortcuts */}
            <div className="w-full sm:w-48 bg-slate-50/70 p-3 border-b sm:border-b-0 sm:border-r border-slate-200/80 space-y-1">
              <div className="text-3xs font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Preset Cepat
              </div>

              {[
                { id: 'prev_month' as DatePreset, label: 'Bulan Lalu (Okt 2026)' },
                { id: 'mtd' as DatePreset, label: 'Bulan Ini (Nov 2026)' },
                { id: '7d' as DatePreset, label: '7 Hari Terakhir' },
                { id: '30d' as DatePreset, label: '30 Hari Terakhir' },
                {
                  id: 'all' as DatePreset,
                  label: `Semua (${availableDates.length} Hari)`,
                },
                { id: 'custom' as DatePreset, label: 'Kustom Tanggal' },
              ].map((preset) => {
                const isSelected = tempPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#127a60] text-white font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-emerald-50 hover:text-[#127a60]'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-200" />}
                  </button>
                );
              })}
            </div>

            {/* Right Column: Interactive Calendar Grid */}
            <div className="flex-1 p-4 bg-white">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Bulan sebelumnya"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#127a60] hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-xs font-bold text-[#127a60] font-sans">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Bulan berikutnya"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#127a60] hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="text-3xs font-semibold text-slate-400 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {calendarDays.map((cell, idx) => {
                  if (!cell.isCurrentMonth) {
                    return <div key={`empty-${idx}`} className="h-8 w-8 mx-auto" />;
                  }

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => handleDateClick(cell.dateStr)}
                      onMouseEnter={() =>
                        tempStart && !tempEnd && setHoveredDate(cell.dateStr)
                      }
                      className={getDayStyle(cell.dateStr)}
                      title={`${cell.dateStr}${
                        cell.hasData ? ' (Data tersedia)' : ''
                      }`}
                    >
                      <span>{cell.dayNumber}</span>
                      {cell.hasData && (
                        <span
                          className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                            tempStart === cell.dateStr || tempEnd === cell.dateStr
                              ? 'bg-emerald-200'
                              : 'bg-emerald-600'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Manual Date Input Fields */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-3xs font-semibold text-slate-500 uppercase block mb-1">
                    Dari:
                  </label>
                  <input
                    type="date"
                    value={tempStart || ''}
                    onChange={(e) => {
                      setTempPreset('custom');
                      setTempStart(e.target.value || null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-slate-700 focus:outline-none focus:border-[#127a60] focus:ring-1 focus:ring-[#127a60]"
                  />
                </div>
                <div>
                  <label className="text-3xs font-semibold text-slate-500 uppercase block mb-1">
                    Sampai:
                  </label>
                  <input
                    type="date"
                    value={tempEnd || tempStart || ''}
                    onChange={(e) => {
                      setTempPreset('custom');
                      setTempEnd(e.target.value || null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-slate-700 focus:outline-none focus:border-[#127a60] focus:ring-1 focus:ring-[#127a60]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls: Reset, Batal, & Terapkan */}
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#127a60] font-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset (Okt 2026)</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#127a60] hover:bg-[#0e634e] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-200" />
                <span>Terapkan Rentang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
