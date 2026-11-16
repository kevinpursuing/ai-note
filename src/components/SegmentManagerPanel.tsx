import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Settings,
  Info,
} from 'lucide-react';
import {
  formatDuration,
  formatFriendlyDate,
  generateCalendarMatrix,
  groupClipsByStudent,
  type AutomationTask,
  type GrowthRecordDraft,
  type GrowthTemplate,
  type StudentProfile,
  type VoiceClip,
} from '../utils/segmentLogic';
import { AutomationConfigModal } from './AutomationConfigModal';
import { DraftDetailModal } from './DraftDetailModal';

export type RecordsTabId = 'raw' | 'students' | 'drafts' | 'records';

interface SegmentManagerPanelProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  clipsForDate: VoiceClip[];
  allClips: VoiceClip[];
  students: StudentProfile[];
  templates: GrowthTemplate[];
  drafts: GrowthRecordDraft[];
  automationTasks: AutomationTask[];
  onAssignClipStudent: (clipId: string, studentId: string) => void;
  onUpdateDraftContent: (draftId: string, content: string) => void;
  onPublishDraft: (draftId: string, content?: string) => void;
  onRegenerateDraft: (draftId: string) => void;
  onAddTask: (task: AutomationTask) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onRunTaskNow: (task: AutomationTask) => number;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const SegmentManagerPanel: React.FC<SegmentManagerPanelProps> = ({
  selectedDate,
  onSelectDate,
  clipsForDate,
  allClips,
  students,
  templates,
  drafts,
  automationTasks,
  onAssignClipStudent,
  onUpdateDraftContent,
  onPublishDraft,
  onRegenerateDraft,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onRunTaskNow,
}) => {
  const [activeTab, setActiveTab] = useState<RecordsTabId>('raw');
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);

  // Raw recordings tab calendar state
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
  const [showCalendarHint, setShowCalendarHint] = useState(false);

  // Student list tab expanded state
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    students[0]?.id || null
  );

  // Drafts & Published Records filter, detail modal, and automation modal state
  const [selectedTemplateFilter, setSelectedTemplateFilter] =
    useState<string>('all');
  const [selectedRecordTemplateFilter, setSelectedRecordTemplateFilter] =
    useState<string>('all');
  const [detailContext, setDetailContext] = useState<{
    mode: 'drafts' | 'records';
    ids: string[];
    activeId: string;
  } | null>(null);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);

  // Student clip groups for Tab 2
  const studentGroups = useMemo(
    () => groupClipsByStudent(allClips, students),
    [allClips, students]
  );

  // Unpublished drafts for Tab 3
  const unpublishedDrafts = useMemo(
    () => drafts.filter((d) => d.status !== 'published'),
    [drafts]
  );

  const filteredDrafts = useMemo(() => {
    if (selectedTemplateFilter === 'all') return unpublishedDrafts;
    return unpublishedDrafts.filter(
      (d) => d.templateId === selectedTemplateFilter
    );
  }, [unpublishedDrafts, selectedTemplateFilter]);

  // Published growth records for Tab 4
  const publishedRecords = useMemo(
    () => drafts.filter((d) => d.status === 'published'),
    [drafts]
  );

  const filteredRecords = useMemo(() => {
    if (selectedRecordTemplateFilter === 'all') return publishedRecords;
    return publishedRecords.filter(
      (d) => d.templateId === selectedRecordTemplateFilter
    );
  }, [publishedRecords, selectedRecordTemplateFilter]);

  const detailModalItems = useMemo(() => {
    if (!detailContext) return [];
    return detailContext.ids
      .map((id) => drafts.find((d) => d.id === id))
      .filter((d): d is GrowthRecordDraft => Boolean(d));
  }, [detailContext, drafts]);

  const availableClasses = useMemo(
    () => Array.from(new Set(students.map((s) => s.classLabel))),
    [students]
  );

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

    if (clip.mediaType === 'video' && clip.mediaUrl) {
      return;
    }

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
    <div className="space-y-3 select-none">
      {/* Segmented Light Gray-Blue Tab Bar (4 tabs, compact single-row on mobile) */}
      <nav
        role="tablist"
        aria-label="记录视图切换"
        className="apple-recessed-track p-0.5 rounded-full flex items-center gap-0.5"
      >
        {(
          [
            { id: 'raw', label: '原始录音' },
            { id: 'students', label: '学生列表' },
            { id: 'drafts', label: '成长记录草稿' },
            { id: 'records', label: '成长记录' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-h-[30px] px-1.5 sm:px-2 rounded-full text-[11px] sm:text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                active
                  ? 'apple-pill-active text-[#111827] font-semibold'
                  : 'text-[#64748B] font-medium hover:text-[#111827]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ===================================================================
          TAB 1: 原始录音 (Date-filtered raw voice/video/file recordings)
          =================================================================== */}
      {activeTab === 'raw' && (
        <div role="tabpanel" aria-label="原始录音" className="space-y-4">
          {/* Quick Select Bar: Quick Pills + Tactile Calendar Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              role="group"
              aria-label="快捷日期筛选"
              className="apple-recessed-track p-0.5 rounded-full flex items-center gap-0.5"
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
                    className={`min-h-[34px] px-3.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                      active
                        ? 'apple-pill-active text-[#111827] font-semibold'
                        : 'text-[#64748B] hover:text-[#111827]'
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
              className={`min-h-[34px] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap active:scale-95 ${
                isCalendarOpen
                  ? 'bg-[#EFF4FF] border border-[#DCE7FE] text-[#3B66F5]'
                  : 'bg-[#F1F3F7] hover:bg-[#E7EBF2] text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#3B66F5]" />
              <span>{isCalendarOpen ? '收起日历' : '以往日期'}</span>
            </button>
          </div>

          {/* Clean Perpetual Calendar Plate */}
          {isCalendarOpen && (
            <section
              aria-label="拟物日期筛选台历"
              className="calendar-desk-plate rounded-2xl p-3.5 sm:p-4 transition-all"
            >
              <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold tracking-tight text-[#111827]">
                    {viewYear} 年 {viewMonth} 月
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCalendarHint((v) => !v)}
                    aria-label="日历说明"
                    aria-expanded={showCalendarHint}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      showCalendarHint
                        ? 'bg-[#EFF4FF] text-[#3B66F5]'
                        : 'text-[#94A3B8] hover:text-[#111827]'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  {(viewYear !== 2026 || viewMonth !== 11) && (
                    <button
                      type="button"
                      onClick={handleJumpToToday}
                      className="px-2 py-0.5 rounded-full bg-[#EFF4FF] hover:bg-[#E1EBFF] text-[11px] font-medium text-[#3B66F5] cursor-pointer"
                    >
                      本月
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="上一月"
                    className="w-8 h-8 rounded-lg hover:bg-[#F1F3F7] flex items-center justify-center text-[#64748B] hover:text-[#111827] cursor-pointer active:scale-95 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="下一月"
                    className="w-8 h-8 rounded-lg hover:bg-[#F1F3F7] flex items-center justify-center text-[#64748B] hover:text-[#111827] cursor-pointer active:scale-95 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-medium text-[#94A3B8]">
                {WEEKDAYS.map((wd) => (
                  <span key={wd} className="py-1">
                    {wd}
                  </span>
                ))}
              </div>

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
                          ? 'text-[#111827] hover:bg-[#F3F5F9]'
                          : 'text-[#94A3B8]/50'
                      }`}
                    >
                      <span
                        className={`text-xs leading-none tabular-nums ${
                          isSelected
                            ? 'font-bold text-[#3B66F5]'
                            : d.isToday
                            ? 'font-semibold text-[#3B66F5]'
                            : 'font-medium'
                        }`}
                      >
                        {d.dayNumber}
                      </span>

                      {hasRecordings && (
                        <span
                          aria-hidden="true"
                          className={`w-1 h-1 rounded-full mt-1 ${
                            isSelected ? 'bg-[#3B66F5]' : 'bg-[#3B66F5]/75'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {showCalendarHint && (
                <div className="mt-2.5 pt-2 border-t border-[#EEF1F6] flex items-center gap-1.5 text-[11px] text-[#64748B] px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3B66F5] shrink-0" />
                  <span>蓝点代表当日有记录，点选日期查看</span>
                </div>
              )}
            </section>
          )}

          <div className="flex items-center justify-between px-1 pt-1">
            <h3 className="text-xs font-semibold tracking-wider text-[#64748B]">
              {formatFriendlyDate(selectedDate)}
            </h3>
            <span className="font-mono text-xs text-[#94A3B8] tabular-nums">
              {clipsForDate.length} 条
            </span>
          </div>

          <div className="space-y-2.5" data-testid="segment-clips-list">
            {clipsForDate.length === 0 ? (
              <div className="apple-ceramic-card rounded-2xl py-10 px-6 text-center">
                <p className="text-xs tracking-wider text-[#94A3B8]">
                  暂无记录
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
                    className="apple-ceramic-card rounded-2xl px-4 py-3.5 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 text-xs">
                        <span className="font-semibold tracking-tight text-[#111827] whitespace-nowrap">
                          片段 {segmentNum}
                        </span>
                        {mediaLabel && (
                          <>
                            <span
                              aria-hidden="true"
                              className="text-[#94A3B8]"
                            >
                              ·
                            </span>
                            <span className="text-[#64748B] whitespace-nowrap">
                              {mediaLabel}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true" className="text-[#94A3B8]">
                          ·
                        </span>
                        <select
                          aria-label={`归属学生 ${segmentNum}`}
                          value={clip.studentId || ''}
                          onChange={(e) =>
                            onAssignClipStudent(clip.id, e.target.value)
                          }
                          className="bg-transparent text-xs text-[#64748B] hover:text-[#111827] focus:outline-none cursor-pointer truncate max-w-[92px]"
                        >
                          <option value="">未指定</option>
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-[#94A3B8] tabular-nums whitespace-nowrap">
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
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95 ${
                            isPlaying
                              ? 'bg-[#3B66F5] text-white'
                              : 'bg-[#F1F3F7] hover:bg-[#E7EBF2] text-[#111827]'
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
                      <p className="font-mono text-[11px] text-[#64748B] mb-1 truncate">
                        {clip.fileName}
                        {clip.fileSizeLabel ? ` · ${clip.fileSizeLabel}` : ''}
                      </p>
                    )}

                    <p className="text-[14px] leading-relaxed text-[#111827]">
                      {clip.transcript}
                    </p>

                    {isPlaying &&
                      clip.mediaType === 'video' &&
                      clip.mediaUrl && (
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
      )}

      {/* ===================================================================
          TAB 2: 学生列表 (Recordings grouped per student)
          =================================================================== */}
      {activeTab === 'students' && (
        <div
          role="tabpanel"
          aria-label="学生列表"
          data-testid="student-clips-list"
          className="space-y-2.5"
        >
          {studentGroups.map((group) => {
            const isExpanded = expandedStudentId === group.student.id;
            return (
              <article
                key={group.student.id}
                className="apple-ceramic-card rounded-2xl px-4 py-3.5 transition-all"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedStudentId((prev) =>
                      prev === group.student.id ? null : group.student.id
                    )
                  }
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#111827]">
                        {group.student.name}
                      </span>
                      <span aria-hidden="true" className="text-xs text-[#94A3B8]">
                        ·
                      </span>
                      <span className="text-xs text-[#64748B]">
                        {group.student.classLabel}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-[#94A3B8] tabular-nums mt-0.5">
                      {group.clips.length} 条
                      {group.totalDurationSec > 0
                        ? ` · ${formatDuration(group.totalDurationSec)}`
                        : ''}
                    </p>
                  </div>

                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </button>

                {!isExpanded && group.clips[0] && (
                  <p className="text-xs text-[#64748B] leading-relaxed mt-2 line-clamp-2">
                    {group.clips[0].transcript}
                  </p>
                )}

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[#EEF1F6] space-y-3">
                    {group.clips.length === 0 ? (
                      <p className="text-xs text-[#94A3B8] py-1">
                        暂无记录
                      </p>
                    ) : (
                      group.clips.map((clip) => {
                        const isPlaying = playingClipId === clip.id;
                        return (
                          <div
                            key={clip.id}
                            className="space-y-1 pb-2.5 border-b border-[#F1F3F7] last:border-b-0 last:pb-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[11px] text-[#94A3B8] tabular-nums">
                                {clip.dateStr.slice(5)} {clip.createdAt.slice(0, 5)}
                                {clip.durationSec > 0
                                  ? ` · ${formatDuration(clip.durationSec)}`
                                  : ''}
                                {clip.mediaType === 'video'
                                  ? ' · 录像'
                                  : clip.mediaType === 'file'
                                  ? ' · 文件'
                                  : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTogglePlayClip(clip)}
                                aria-label={
                                  isPlaying
                                    ? `暂停 ${group.student.name} 的记录`
                                    : `播放 ${group.student.name} 的记录`
                                }
                                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95 ${
                                  isPlaying
                                    ? 'bg-[#3B66F5] text-white'
                                    : 'bg-[#F1F3F7] hover:bg-[#E7EBF2] text-[#111827]'
                                }`}
                              >
                                {isPlaying ? (
                                  <Pause className="w-3 h-3 fill-current" />
                                ) : (
                                  <Play className="w-3 h-3 fill-current ml-0.5" />
                                )}
                              </button>
                            </div>
                            {clip.fileName && (
                              <p className="font-mono text-[11px] text-[#64748B] truncate">
                                {clip.fileName}
                              </p>
                            )}
                            <p className="text-[13.5px] leading-relaxed text-[#111827]">
                              {clip.transcript}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ===================================================================
          TAB 3: 成长记录草稿 (Collapsed Drafts List + Icon-Only Settings Entry)
          =================================================================== */}
      {activeTab === 'drafts' && (
        <div
          role="tabpanel"
          aria-label="成长记录草稿"
          data-testid="growth-drafts-list"
          className="space-y-3"
        >
          {/* Template Filter Strip + Icon-Only Automation Settings Button */}
          <div className="flex items-center justify-between gap-2">
            <div
              role="group"
              aria-label="按模板筛选"
              className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
            >
              <button
                type="button"
                onClick={() => setSelectedTemplateFilter('all')}
                className={`min-h-[30px] px-3 py-1 rounded-full text-xs cursor-pointer whitespace-nowrap shrink-0 transition-all ${
                  selectedTemplateFilter === 'all'
                    ? 'bg-[#EFF4FF] text-[#3B66F5] font-semibold border border-[#DCE7FE]'
                    : 'bg-[#F3F5F9] text-[#64748B] font-medium hover:text-[#111827] hover:bg-[#EAEFF6] border border-transparent'
                }`}
              >
                全部
              </button>
              {templates.map((tpl) => {
                const active = selectedTemplateFilter === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setSelectedTemplateFilter(tpl.id)}
                    className={`min-h-[30px] px-3 py-1 rounded-full text-xs cursor-pointer whitespace-nowrap shrink-0 transition-all ${
                      active
                        ? 'bg-[#EFF4FF] text-[#3B66F5] font-semibold border border-[#DCE7FE]'
                        : 'bg-[#F3F5F9] text-[#64748B] font-medium hover:text-[#111827] hover:bg-[#EAEFF6] border border-transparent'
                    }`}
                  >
                    {tpl.title}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsAutomationModalOpen(true)}
              aria-label="自动化生成设置"
              title="自动化生成"
              className="w-8 h-8 rounded-full bg-[#F1F3F7] hover:bg-[#E7EBF2] flex items-center justify-center text-[#475569] hover:text-[#111827] cursor-pointer shrink-0 transition-colors active:scale-95"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Content: Growth Record Drafts List */}
          {filteredDrafts.length === 0 ? (
            <div className="apple-ceramic-card rounded-2xl py-10 px-6 text-center">
              <p className="text-xs text-[#94A3B8]">暂无草稿</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDrafts.map((draft) => (
                <article
                  key={draft.id}
                  className="apple-ceramic-card rounded-2xl px-4 py-3 transition-all"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setDetailContext({
                        mode: 'drafts',
                        ids: filteredDrafts.map((d) => d.id),
                        activeId: draft.id,
                      })
                    }
                    aria-label={`查看 ${draft.templateTitle} ${draft.studentName} 草稿详情`}
                    className="w-full flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[13px]">
                        <span className="font-semibold text-[#111827] truncate">
                          {draft.templateTitle}
                        </span>
                        <span aria-hidden="true" className="text-[#94A3B8]">
                          ·
                        </span>
                        <span className="font-medium text-[#111827] whitespace-nowrap">
                          {draft.studentName}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-[#94A3B8] tabular-nums mt-0.5">
                        {draft.dateStr.slice(5)} {draft.updatedAt}
                      </div>
                    </div>

                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          TAB 4: 成长记录 (Published Growth Records)
          =================================================================== */}
      {activeTab === 'records' && (
        <div
          role="tabpanel"
          aria-label="成长记录"
          data-testid="published-growth-records-list"
          className="space-y-3"
        >
          {/* Template Filter Strip */}
          <div
            role="group"
            aria-label="按模板筛选成长记录"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              onClick={() => setSelectedRecordTemplateFilter('all')}
              className={`min-h-[30px] px-3 py-1 rounded-full text-xs cursor-pointer whitespace-nowrap shrink-0 transition-all ${
                selectedRecordTemplateFilter === 'all'
                  ? 'bg-[#EFF4FF] text-[#3B66F5] font-semibold border border-[#DCE7FE]'
                  : 'bg-[#F3F5F9] text-[#64748B] font-medium hover:text-[#111827] hover:bg-[#EAEFF6] border border-transparent'
              }`}
            >
              全部
            </button>
            {templates.map((tpl) => {
              const active = selectedRecordTemplateFilter === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedRecordTemplateFilter(tpl.id)}
                  className={`min-h-[30px] px-3 py-1 rounded-full text-xs cursor-pointer whitespace-nowrap shrink-0 transition-all ${
                    active
                      ? 'bg-[#EFF4FF] text-[#3B66F5] font-semibold border border-[#DCE7FE]'
                      : 'bg-[#F3F5F9] text-[#64748B] font-medium hover:text-[#111827] hover:bg-[#EAEFF6] border border-transparent'
                  }`}
                >
                  {tpl.title}
                </button>
              );
            })}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="apple-ceramic-card rounded-2xl py-10 px-6 text-center">
              <p className="text-xs text-[#94A3B8]">暂无已发布的成长记录</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRecords.map((record) => (
                <article
                  key={record.id}
                  className="apple-ceramic-card rounded-2xl px-4 py-3 transition-all"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setDetailContext({
                        mode: 'records',
                        ids: filteredRecords.map((r) => r.id),
                        activeId: record.id,
                      })
                    }
                    aria-label={`查看 ${record.templateTitle} ${record.studentName} 成长记录详情`}
                    className="w-full flex items-center justify-between gap-3 text-left cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[13px]">
                        <span className="font-semibold text-[#111827] truncate">
                          {record.templateTitle}
                        </span>
                        <span aria-hidden="true" className="text-[#94A3B8]">
                          ·
                        </span>
                        <span className="font-medium text-[#111827] whitespace-nowrap">
                          {record.studentName}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-[#94A3B8] tabular-nums mt-0.5">
                        {record.dateStr.slice(5)}{' '}
                        {record.publishedAt || record.updatedAt}
                      </div>
                    </div>

                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] shrink-0">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Draft / Growth Record Detail Modal (Top Close + Switcher Tabs + Direct Publish) */}
      <DraftDetailModal
        isOpen={detailContext !== null}
        title={detailContext?.mode === 'records' ? '成长记录详情' : '草稿详情'}
        drafts={detailModalItems}
        activeDraftId={detailContext?.activeId || null}
        onSelectDraft={(id) =>
          setDetailContext((prev) => (prev ? { ...prev, activeId: id } : null))
        }
        onClose={() => setDetailContext(null)}
        onUpdateDraftContent={onUpdateDraftContent}
        onPublishDraft={onPublishDraft}
        onRegenerateDraft={onRegenerateDraft}
      />

      {/* Automation Config Modal (Triggered strictly from icon-only Settings button in Tab 3) */}
      <AutomationConfigModal
        isOpen={isAutomationModalOpen}
        onClose={() => setIsAutomationModalOpen(false)}
        tasks={automationTasks}
        templates={templates}
        availableClasses={availableClasses}
        drafts={drafts}
        onAddTask={onAddTask}
        onToggleTask={onToggleTask}
        onDeleteTask={onDeleteTask}
        onRunTaskNow={onRunTaskNow}
        onUpdateDraftContent={onUpdateDraftContent}
      />
    </div>
  );
};
