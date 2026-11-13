import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  formatDuration,
  formatFriendlyDate,
  generateCalendarMatrix,
  type VoiceClip,
} from '../utils/segmentLogic';

interface SegmentManagerPanelProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  clipsForDate: VoiceClip[];
  allClips: VoiceClip[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const SegmentManagerPanel: React.FC<SegmentManagerPanelProps> = ({
  selectedDate,
  onSelectDate,
  clipsForDate,
  allClips,
}) => {
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);

  // Initialize view month based on selectedDate or default 2026-11
  const initialYearMonth = useMemo(() => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
      };
    }
    return { year: 2026, month: 11 };
  }, [selectedDate]);

  const [viewYear, setViewYear] = useState<number>(initialYearMonth.year);
  const [viewMonth, setViewMonth] = useState<number>(initialYearMonth.month);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);

  // Map of dateStr -> clip count for quick dot indicators
  const clipsCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const clip of allClips) {
      map.set(clip.dateStr, (map.get(clip.dateStr) || 0) + 1);
    }
    return map;
  }, [allClips]);

  const calendarDays = useMemo(() => {
    return generateCalendarMatrix(viewYear, viewMonth, '2026-11-05');
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setViewYear(2026);
    setViewMonth(11);
    onSelectDate('2026-11-05');
  };

  const handleSelectDay = (dateStr: string) => {
    onSelectDate(dateStr);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (y !== viewYear || m !== viewMonth) {
        setViewYear(y);
        setViewMonth(m);
      }
    }
  };

  const stopAllPlayback = () => {
    window.speechSynthesis?.cancel();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
  };

  const handleTogglePlayClip = (clip: VoiceClip) => {
    if (playingClipId === clip.id) {
      stopAllPlayback();
      setPlayingClipId(null);
      return;
    }
    stopAllPlayback();
    setPlayingClipId(clip.id);

    // Inline video playback handles its own element via playingClipId
    if (clip.mediaType === 'video' && clip.mediaUrl) {
      return;
    }

    // Real uploaded audio file playback
    if (clip.mediaType === 'audio' && clip.mediaUrl) {
      try {
        const audio = new Audio(clip.mediaUrl);
        audioElRef.current = audio;
        audio.onended = () => setPlayingClipId(null);
        audio.onerror = () => setPlayingClipId(null);
        audio.play().catch(() => setPlayingClipId(null));
        return;
      } catch {
        // fallback
      }
    }

    if ('speechSynthesis' in window) {
      try {
        const utter = new SpeechSynthesisUtterance(clip.transcript);
        utter.lang = 'zh-CN';
        utter.rate = 1.05;
        utter.onend = () => setPlayingClipId(null);
        utter.onerror = () => setPlayingClipId(null);
        window.speechSynthesis.speak(utter);
        return;
      } catch {
        // fallback
      }
    }
    setTimeout(() => {
      setPlayingClipId((prev) => (prev === clip.id ? null : prev));
    }, 3000);
  };

  return (
    <div className="space-y-5 select-none">
      {/* Quick Select Bar: Quick Pills + Tactile Calendar Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="快捷日期筛选"
          className="apple-recessed-track p-1 rounded-full flex items-center gap-0.5"
        >
          {[
            { dateStr: '2026-11-05', label: '今天' },
            { dateStr: '2026-11-04', label: '昨天' },
            { dateStr: '2026-11-03', label: '前天' },
          ].map((item) => {
            const active = selectedDate === item.dateStr;
            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => handleSelectDay(item.dateStr)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  active
                    ? 'apple-pill-active text-[#1D1D1F] font-semibold'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsCalendarOpen((prev) => !prev)}
          aria-label="展开或收起拟物台历"
          className={`tactile-subtle-btn min-h-[44px] px-3.5 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap active:scale-95 ${
            isCalendarOpen
              ? 'apple-pill-active text-[#1D1D1F] font-semibold'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#FF3B30]" />
          <span>{isCalendarOpen ? '收起台历' : '选择以往日期'}</span>
        </button>
      </div>

      {/* Skeuomorphic Tactile Perpetual Calendar Pad */}
      {isCalendarOpen && (
        <section
          aria-label="拟物日期筛选台历"
          className="calendar-desk-plate rounded-[28px] p-4 sm:p-5 transition-all"
        >
          {/* Calendar Header with Rotary Tactile Controls */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-[#1D1D1F]">
                {viewYear} 年 {viewMonth} 月
              </span>
              {(viewYear !== 2026 || viewMonth !== 11) && (
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="px-2 py-0.5 rounded-full bg-black/5 hover:bg-black/10 text-[11px] text-[#6E6E73] cursor-pointer"
                >
                  回到本月
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="上一月"
                className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full tactile-subtle-btn flex items-center justify-center text-[#1D1D1F] cursor-pointer active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="下一月"
                className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full tactile-subtle-btn flex items-center justify-center text-[#1D1D1F] cursor-pointer active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-medium text-[#86868B]">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="py-1">
                {wd}
              </span>
            ))}
          </div>

          {/* Day Grid Matrix with Acoustic Vermilion Indicator Pips */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {calendarDays.map((d) => {
              const isSelected = selectedDate === d.dateStr;
              const clipCount = clipsCountByDate.get(d.dateStr) || 0;
              const hasRecordings = clipCount > 0;

              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => handleSelectDay(d.dateStr)}
                  aria-label={`${d.dateStr}${
                    hasRecordings ? `，有 ${clipCount} 条录音` : ''
                  }`}
                  className={`w-10 h-10 mx-auto rounded-2xl flex flex-col items-center justify-center relative cursor-pointer transition-all active:scale-95 ${
                    isSelected
                      ? 'calendar-cell-active scale-105'
                      : d.isCurrentMonth
                      ? 'text-[#1D1D1F] hover:bg-white/60'
                      : 'text-[#86868B]/40'
                  }`}
                >
                  <span
                    className={`text-xs leading-none tabular-nums ${
                      isSelected
                        ? 'font-bold text-[#1D1D1F]'
                        : d.isToday
                        ? 'font-semibold text-[#FF3B30]'
                        : 'font-medium'
                    }`}
                  >
                    {d.dayNumber}
                  </span>

                  {/* Physical Acoustic Vermilion Pip Indicator */}
                  {hasRecordings && (
                    <span
                      aria-hidden="true"
                      className={`w-1 h-1 rounded-full mt-1 ${
                        isSelected
                          ? 'bg-[#FF3B30]'
                          : 'bg-[#FF3B30]/75'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Footnote Indicator Legend */}
          <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px] text-[#86868B] px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
              <span>红点表示当日有录音片段</span>
            </div>
            <span>点选任意日期即可查阅</span>
          </div>
        </section>
      )}

      {/* Date Header for Current Fragment List */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h3 className="text-xs font-semibold tracking-wider text-[#86868B]">
          {formatFriendlyDate(selectedDate)}
        </h3>
        <span className="font-mono text-xs text-[#86868B] tabular-nums">
          {clipsForDate.length} 条记录
        </span>
      </div>

      {/* Ultra-Minimal Segment Cards for Selected Date */}
      <div className="space-y-3.5" data-testid="segment-clips-list">
        {clipsForDate.length === 0 ? (
          <div className="apple-ceramic-card rounded-[24px] py-14 px-6 text-center">
            <p className="text-xs tracking-wider text-[#86868B]">
              该日暂无录音片段
            </p>
            <p className="text-[11px] text-[#86868B]/70 mt-1">
              轻按主界面麦克风按键随时录制
            </p>
          </div>
        ) : (
          clipsForDate.map((clip, idx) => {
            const isPlaying = playingClipId === clip.id;
            const segmentNum = String(clipsForDate.length - idx).padStart(
              2,
              '0'
            );
            const mediaLabel =
              clip.mediaType === 'video'
                ? '录像'
                : clip.mediaType === 'file'
                ? '文件'
                : clip.audioSource === 'upload'
                ? '音频文件'
                : null;

            return (
              <article
                key={clip.id}
                className="apple-ceramic-card rounded-[24px] p-5 transition-all"
              >
                <div className="flex items-center justify-between mb-2.5 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold tracking-tight text-[#1D1D1F] whitespace-nowrap">
                      片段 {segmentNum}
                    </span>
                    {mediaLabel && (
                      <>
                        <span aria-hidden="true" className="text-xs text-[#86868B]">
                          ·
                        </span>
                        <span className="text-xs text-[#86868B] whitespace-nowrap">
                          {mediaLabel}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[11px] text-[#86868B] tabular-nums whitespace-nowrap">
                      {clip.createdAt.slice(0, 5)}
                      {clip.durationSec > 0
                        ? ` · ${formatDuration(clip.durationSec)}`
                        : ''}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleTogglePlayClip(clip)}
                      aria-label={
                        isPlaying
                          ? `暂停片段 ${segmentNum}`
                          : `播放片段 ${segmentNum}`
                      }
                      className={`w-10 h-10 min-w-[44px] min-h-[44px] -mr-1.5 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 ${
                        isPlaying
                          ? 'bg-[#FF3B30] text-white shadow-xs'
                          : 'tactile-subtle-btn text-[#1D1D1F]'
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {clip.fileName && (
                  <p className="font-mono text-[11px] text-[#6E6E73] mb-1.5 truncate">
                    {clip.fileName}
                    {clip.fileSizeLabel ? ` · ${clip.fileSizeLabel}` : ''}
                  </p>
                )}

                <p className="text-[15px] leading-relaxed text-[#1D1D1F]">
                  {clip.transcript}
                </p>

                {isPlaying && clip.mediaType === 'video' && clip.mediaUrl && (
                  <video
                    src={clip.mediaUrl}
                    controls
                    autoPlay
                    playsInline
                    onEnded={() => setPlayingClipId(null)}
                    className="w-full rounded-2xl mt-3 bg-black max-h-56"
                  />
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
