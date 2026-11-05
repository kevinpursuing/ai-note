export interface VoiceClip {
  id: string;
  segmentId: string;
  dateStr: string; // YYYY-MM-DD
  createdAt: string; // HH:mm:ss
  durationSec: number;
  transcript: string;
  starred: boolean;
  audioSource: 'mic' | 'simulated';
  confidence: number;
  waveformPeaks: number[];
}

export interface AIWritebackEntry {
  id: string;
  createdAt: string;
  modeTitle: string;
  modelName: string;
  content: string;
  basedOnClipIds: string[];
}

export interface DailySegment {
  id: string;
  dateStr: string; // YYYY-MM-DD
  title: string; // e.g. "片段 01", "片段 02"
  periodLabel: string; // e.g. "09:15"
  notes: string; // Editable segment notes & AI write-back destination
  aiEntries: AIWritebackEntry[];
}

export interface SegmentStats {
  clipCount: number;
  totalDurationSec: number;
  totalCharacters: number;
  starredCount: number;
}

export type AIAnalysisPresetId =
  | 'summary'
  | 'todo'
  | 'insight'
  | 'polish';

export interface ModelEndpointConfig {
  asrModel: string;
  llmModel: string;
  endpointUrl: string;
  autoPunctuation: boolean;
  autoRouteByPeriod: boolean;
}

export interface CalendarDayInfo {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function formatDuration(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatFriendlyDate(dateStr: string, todayStr = '2026-11-05'): string {
  if (dateStr === todayStr) return '今天 · 11月5日';
  if (dateStr === '2026-11-04') return '昨天 · 11月4日';
  if (dateStr === '2026-11-03') return '前天 · 11月3日';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m - 1, d);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const w = weekdays[date.getDay()] || '';
    return `${m}月${d}日 · ${w}`;
  }
  return dateStr;
}

export function generateCalendarMatrix(
  year: number,
  month: number, // 1..12
  todayStr = '2026-11-05'
): CalendarDayInfo[] {
  const firstDay = new Date(year, month - 1, 1);
  const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const days: CalendarDayInfo[] = [];

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month padding
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

export function calculateSegmentStats(
  clips: VoiceClip[],
  segmentId: string
): SegmentStats {
  const matching = clips.filter((c) => c.segmentId === segmentId);
  return {
    clipCount: matching.length,
    totalDurationSec: matching.reduce((acc, c) => acc + c.durationSec, 0),
    totalCharacters: matching.reduce((acc, c) => acc + c.transcript.trim().length, 0),
    starredCount: matching.filter((c) => c.starred).length,
  };
}

/**
 * Resolves which DailySegment a new voice recording should be automatically filed into.
 * If preferredSegmentId belongs to the given dateStr, uses it; otherwise picks the latest
 * segment on that date, or creates a default daily segment descriptor.
 */
export function resolveTargetSegment(
  segments: DailySegment[],
  dateStr: string,
  preferredSegmentId: string | null,
  currentHour: number = 9
): { segment: DailySegment; createdNew: boolean } {
  if (preferredSegmentId) {
    const found = segments.find(
      (s) => s.id === preferredSegmentId && s.dateStr === dateStr
    );
    if (found) {
      return { segment: found, createdNew: false };
    }
  }

  const sameDaySegments = segments.filter((s) => s.dateStr === dateStr);
  if (sameDaySegments.length > 0) {
    return {
      segment: sameDaySegments[sameDaySegments.length - 1],
      createdNew: false,
    };
  }

  const periodLabel = `${String(currentHour).padStart(2, '0')}:00`;
  const nextIndex = String(sameDaySegments.length + 1).padStart(2, '0');

  const newSegment: DailySegment = {
    id: `seg-${dateStr}-${Date.now()}`,
    dateStr,
    title: `片段 ${nextIndex}`,
    periodLabel,
    notes: '',
    aiEntries: [],
  };

  return { segment: newSegment, createdNew: true };
}

export function createRecordedClip(params: {
  segmentId: string;
  dateStr: string;
  transcript: string;
  durationSec: number;
  audioSource: 'mic' | 'simulated';
  timestampStr?: string;
}): VoiceClip {
  const cleanText = params.transcript.trim();
  const now = new Date();
  const timeStr =
    params.timestampStr ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  // Deterministic pseudo-random waveform peaks from text content
  const peaks: number[] = [];
  for (let i = 0; i < 24; i++) {
    const code = cleanText.charCodeAt(i % Math.max(1, cleanText.length)) || 65;
    const val = 22 + ((code * (i + 3)) % 72);
    peaks.push(val);
  }

  return {
    id: `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    segmentId: params.segmentId,
    dateStr: params.dateStr,
    createdAt: timeStr,
    durationSec: Math.max(1, Math.round(params.durationSec)),
    transcript: cleanText,
    starred: false,
    audioSource: params.audioSource,
    confidence: 0.98,
    waveformPeaks: peaks,
  };
}

export function mergeClipsInSegment(
  clips: VoiceClip[],
  clipIdsToMerge: string[]
): VoiceClip[] {
  if (clipIdsToMerge.length < 2) return clips;
  const idSet = new Set(clipIdsToMerge);
  const selected = clips.filter((c) => idSet.has(c.id));
  if (selected.length < 2) return clips;

  const first = selected[0];
  const mergedTranscript = selected.map((c) => c.transcript.trim()).join(' ');
  const totalDuration = selected.reduce((sum, c) => sum + c.durationSec, 0);
  const anyStarred = selected.some((c) => c.starred);

  const mergedClip: VoiceClip = {
    ...first,
    id: `clip-merged-${Date.now()}`,
    durationSec: totalDuration,
    transcript: mergedTranscript,
    starred: anyStarred,
  };

  const result: VoiceClip[] = [];
  let inserted = false;
  for (const clip of clips) {
    if (idSet.has(clip.id)) {
      if (!inserted) {
        result.push(mergedClip);
        inserted = true;
      }
    } else {
      result.push(clip);
    }
  }
  return result;
}

/**
 * Generates context-grounded AI analysis and write-back content
 * based on the actual clips recorded inside a DailySegment.
 */
export function generateAIPedagogicalAnalysis(params: {
  segment: DailySegment;
  clips: VoiceClip[];
  presetId: AIAnalysisPresetId;
  customPrompt?: string;
  modelName?: string;
}): AIWritebackEntry {
  const { segment, clips, presetId, customPrompt } = params;
  const segClips = clips.filter((c) => c.segmentId === segment.id);

  const rawCombined = segClips.map((c) => c.transcript).join('；');
  const snippetPreview =
    rawCombined.length > 90
      ? `${rawCombined.slice(0, 90)}...`
      : rawCombined || '暂无录音文本';

  let modeTitle = '要点提炼';
  let content = '';

  if (customPrompt && customPrompt.trim().length > 0) {
    modeTitle = customPrompt.trim().slice(0, 14);
    content = `${segment.title} · ${customPrompt.trim()}
• 原声摘录：${snippetPreview}
• 整理输出：已按您的指令将当前片段中的口述内容结构化归档。`;
  } else if (presetId === 'summary') {
    modeTitle = '要点提炼';
    content = `${segment.title} · 核心要点
• 关键内容：${snippetPreview}
• 结论归纳：聚焦核心优先级，已完成关键信息的结构化提炼。`;
  } else if (presetId === 'todo') {
    modeTitle = '待办清单';
    content = `${segment.title} · 待办事项
• [ ] 跟进事项 1：基于录音（${snippetPreview}）落实核心节点
• [ ] 跟进事项 2：今日结束前复盘执行进度并同步结果`;
  } else if (presetId === 'insight') {
    modeTitle = '深度复盘';
    content = `${segment.title} · 深度复盘
• 思路回顾：${snippetPreview}
• 延伸思考：可将该片段中的关键洞察沉淀为长期备忘索引。`;
  } else {
    modeTitle = '润色成文';
    content = `${segment.title} · 书面整理
${snippetPreview}`;
  }

  return {
    id: `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toTimeString().slice(0, 8),
    modeTitle,
    modelName: params.modelName || 'SenseVoice-LLM (Simulated)',
    content,
    basedOnClipIds: segClips.map((c) => c.id),
  };
}

export function appendAIEntryToSegmentNotes(
  currentNotes: string,
  entry: AIWritebackEntry
): string {
  const separator =
    currentNotes.trim().length > 0 ? '\n\n────────────────────────\n\n' : '';
  return `${currentNotes.trim()}${separator}${entry.content}`;
}
