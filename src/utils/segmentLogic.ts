export type ClipMediaType = 'audio' | 'video' | 'file';

export interface VoiceClip {
  id: string;
  segmentId: string;
  dateStr: string; // YYYY-MM-DD
  createdAt: string; // HH:mm:ss or HH:mm
  durationSec: number;
  transcript: string;
  starred: boolean;
  audioSource: 'mic' | 'simulated' | 'camera' | 'upload';
  mediaType?: ClipMediaType;
  mediaUrl?: string;
  fileName?: string;
  fileSizeLabel?: string;
  studentId?: string;
  studentName?: string;
  confidence: number;
  waveformPeaks: number[];
}

export interface StudentProfile {
  id: string;
  name: string;
  classLabel: string;
}

export interface StudentClipGroup {
  student: StudentProfile;
  clips: VoiceClip[];
  totalDurationSec: number;
  latestDateStr: string;
  latestTime: string;
}

export interface GrowthTemplate {
  id: string;
  title: string;
  summaryHint: string;
  keywords: string[];
}

export interface GrowthRecordDraft {
  id: string;
  studentId: string;
  studentName: string;
  classLabel?: string;
  templateId: string;
  templateTitle: string;
  dateStr: string;
  updatedAt: string;
  content: string;
  sourceClipIds: string[];
  generatedByTaskId?: string;
  status: 'draft' | 'confirmed' | 'published';
  publishedAt?: string;
}

export type ScheduleFrequency = 'daily' | 'weekly';

export interface TaskStudentExecutionItem {
  studentId: string;
  studentName: string;
  classLabel: string;
  templateId: string;
  templateTitle: string;
  draftId: string;
  generatedAt: string; // e.g. "11-05 17:30"
}

export interface TaskExecutionLog {
  id: string;
  taskId: string;
  executedAt: string; // e.g. "11-05 17:30"
  lookbackDays: number;
  targetClasses: string[];
  items: TaskStudentExecutionItem[];
}

export interface AutomationTask {
  id: string;
  title: string;
  frequency: ScheduleFrequency;
  weekdays: number[]; // 1..7 (1 = 周一 ... 7 = 周日)
  timeStr: string; // HH:mm
  templateIds: string[];
  targetClasses: string[]; // empty array means 全部班级
  lookbackDays: number; // e.g. 7 means 结合前7天资料
  enabled: boolean;
  sourceCommand?: string;
  lastRunAt?: string;
  executionLogs: TaskExecutionLog[];
}

export interface ParsedVoiceSchedule {
  title: string;
  frequency: ScheduleFrequency;
  weekdays: number[];
  timeStr: string;
  templateIds: string[];
  targetClasses: string[];
  lookbackDays: number;
  summaryLabel: string;
  rawCommand: string;
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

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

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

export function matchStudentFromText(
  text: string,
  students: StudentProfile[]
): StudentProfile | null {
  const normalized = text.trim();
  if (!normalized) return null;
  for (const student of students) {
    if (normalized.includes(student.name)) {
      return student;
    }
    if (student.name.length >= 3) {
      const givenName = student.name.slice(1);
      if (givenName.length >= 2 && normalized.includes(givenName)) {
        return student;
      }
    }
  }
  return null;
}

export function createRecordedClip(params: {
  segmentId: string;
  dateStr: string;
  transcript: string;
  durationSec: number;
  audioSource: 'mic' | 'simulated' | 'camera' | 'upload';
  mediaType?: ClipMediaType;
  mediaUrl?: string;
  fileName?: string;
  fileSizeLabel?: string;
  studentId?: string;
  studentName?: string;
  timestampStr?: string;
}): VoiceClip {
  const cleanText = params.transcript.trim();
  const now = new Date();
  const timeStr =
    params.timestampStr ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

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
    durationSec: Math.max(0, Math.round(params.durationSec)),
    transcript: cleanText,
    starred: false,
    audioSource: params.audioSource,
    mediaType: params.mediaType || 'audio',
    mediaUrl: params.mediaUrl,
    fileName: params.fileName,
    fileSizeLabel: params.fileSizeLabel,
    studentId: params.studentId,
    studentName: params.studentName,
    confidence: 0.98,
    waveformPeaks: peaks,
  };
}

export function groupClipsByStudent(
  clips: VoiceClip[],
  students: StudentProfile[]
): StudentClipGroup[] {
  const buckets = new Map<string, VoiceClip[]>();

  for (const clip of clips) {
    let resolvedId = clip.studentId;
    if (!resolvedId) {
      const matched = matchStudentFromText(
        `${clip.transcript} ${clip.fileName || ''}`,
        students
      );
      resolvedId = matched?.id || 'unassigned';
    }
    const existing = buckets.get(resolvedId) || [];
    existing.push(clip);
    buckets.set(resolvedId, existing);
  }

  const groups: StudentClipGroup[] = [];

  for (const student of students) {
    const studentClips = buckets.get(student.id) || [];
    const sorted = [...studentClips].sort((a, b) =>
      `${b.dateStr} ${b.createdAt}`.localeCompare(`${a.dateStr} ${a.createdAt}`)
    );
    const latest = sorted[0];
    groups.push({
      student,
      clips: sorted,
      totalDurationSec: sorted.reduce((acc, c) => acc + c.durationSec, 0),
      latestDateStr: latest?.dateStr || '',
      latestTime: latest?.createdAt.slice(0, 5) || '',
    });
  }

  const unassignedClips = buckets.get('unassigned');
  if (unassignedClips && unassignedClips.length > 0) {
    const sorted = [...unassignedClips].sort((a, b) =>
      `${b.dateStr} ${b.createdAt}`.localeCompare(`${a.dateStr} ${a.createdAt}`)
    );
    const latest = sorted[0];
    groups.push({
      student: {
        id: 'unassigned',
        name: '通用教研记录',
        classLabel: '未归属学生',
      },
      clips: sorted,
      totalDurationSec: sorted.reduce((acc, c) => acc + c.durationSec, 0),
      latestDateStr: latest?.dateStr || '',
      latestTime: latest?.createdAt.slice(0, 5) || '',
    });
  }

  return groups.sort((a, b) => {
    if (a.clips.length === 0 && b.clips.length > 0) return 1;
    if (b.clips.length === 0 && a.clips.length > 0) return -1;
    return `${b.latestDateStr} ${b.latestTime}`.localeCompare(
      `${a.latestDateStr} ${a.latestTime}`
    );
  });
}

export function isDateWithinLookback(
  clipDateStr: string,
  referenceDateStr: string,
  lookbackDays: number
): boolean {
  if (!Number.isFinite(lookbackDays) || lookbackDays <= 0) return true;
  const parseDate = (s: string) => {
    const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
    return Date.UTC(y, m - 1, d);
  };
  const refMs = parseDate(referenceDateStr);
  const clipMs = parseDate(clipDateStr);
  if (Number.isNaN(refMs) || Number.isNaN(clipMs)) return true;
  const diffDays = (refMs - clipMs) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays < lookbackDays;
}

export function synthesizeGrowthDraft(params: {
  student: StudentProfile;
  template: GrowthTemplate;
  clips: VoiceClip[];
  dateStr: string;
  lookbackDays?: number;
  taskId?: string;
  nowTimeStr?: string;
}): GrowthRecordDraft {
  const { student, template, clips, dateStr, lookbackDays, taskId } = params;
  const studentClips = clips.filter((c) => {
    const belongsToStudent =
      c.studentId === student.id ||
      (!c.studentId &&
        matchStudentFromText(`${c.transcript} ${c.fileName || ''}`, [student]) !==
          null);
    if (!belongsToStudent) return false;
    if (lookbackDays && lookbackDays > 0) {
      return isDateWithinLookback(c.dateStr, dateStr, lookbackDays);
    }
    return true;
  });

  const sortedClips = [...studentClips].sort((a, b) =>
    `${b.dateStr} ${b.createdAt}`.localeCompare(`${a.dateStr} ${a.createdAt}`)
  );

  const evidenceLines = sortedClips.slice(0, 3).map((clip) => {
    const prefix =
      clip.mediaType === 'video'
        ? '录像片段'
        : clip.mediaType === 'file'
        ? `附件《${clip.fileName || '文档'}》`
        : '语音实录';
    const stripped = clip.transcript.trim().replace(/[。！？.!?]+$/, '');
    const text =
      stripped.length > 52 ? `${stripped.slice(0, 52)}…` : stripped;
    return `${clip.dateStr.slice(5)} ${prefix}：${text}`;
  });

  const stripEnd = (s: string) => s.trim().replace(/[。！？.!?]+$/, '');
  const rangeHint = lookbackDays ? `结合近${lookbackDays}天` : '结合';

  let content = '';
  if (sortedClips.length === 0) {
    content = `${student.name}（${student.classLabel}）近${lookbackDays || 7}天暂无新收录的原始语音或视频素材，待补充课堂观察后可随时刷新本「${template.title}」草稿。`;
  } else if (template.id === 'tpl-weekly-obs') {
    content = `本周${student.name}（${student.classLabel}）课堂参与整体积极。${rangeHint}${sortedClips.length}条随堂实录观察：${stripEnd(sortedClips[0].transcript)}。建议下周继续保持互动引导节奏。`;
  } else if (template.id === 'tpl-home-school') {
    content = `家长您好，${rangeHint}记录跟进汇报${student.name}在校表现：${stripEnd(sortedClips[0].transcript)}。${
      sortedClips[1] ? `此外，${stripEnd(sortedClips[1].transcript)}。` : ''
    }后续家校可继续协同巩固。`;
  } else if (template.id === 'tpl-coaching') {
    content = `针对${student.name}的专项辅导要点梳理（${rangeHint}${sortedClips.length}条素材）：${evidenceLines.join('；')}。下一步重点围绕薄弱环节进行分层练习与即时正反馈。`;
  } else {
    content = `综合${student.name}${rangeHint}${sortedClips.length}次记录（${evidenceLines.join('；')}），学生在专注力与表达条理性上表现稳健，已具备阶段提升基础。`;
  }

  const now = new Date();
  const updatedAt =
    params.nowTimeStr ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    id: `draft-${student.id}-${template.id}`,
    studentId: student.id,
    studentName: student.name,
    classLabel: student.classLabel,
    templateId: template.id,
    templateTitle: template.title,
    dateStr,
    updatedAt,
    content,
    sourceClipIds: sortedClips.map((c) => c.id),
    generatedByTaskId: taskId,
    status: 'draft',
  };
}

export function runAutomationTaskGeneration(params: {
  task: AutomationTask;
  students: StudentProfile[];
  templates: GrowthTemplate[];
  clips: VoiceClip[];
  existingDrafts: GrowthRecordDraft[];
  dateStr: string;
  nowTimeStr?: string;
}): {
  drafts: GrowthRecordDraft[];
  generatedCount: number;
  executionLog: TaskExecutionLog;
} {
  const {
    task,
    students,
    templates,
    clips,
    existingDrafts,
    dateStr,
    nowTimeStr,
  } = params;

  const now = new Date();
  const timeClock =
    nowTimeStr ||
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const executedAt = `${dateStr.slice(5)} ${timeClock}`;

  const targetTemplates = templates.filter((t) =>
    task.templateIds.includes(t.id)
  );
  if (targetTemplates.length === 0) {
    return {
      drafts: existingDrafts,
      generatedCount: 0,
      executionLog: {
        id: `exec-${Date.now()}`,
        taskId: task.id,
        executedAt,
        lookbackDays: task.lookbackDays,
        targetClasses: task.targetClasses,
        items: [],
      },
    };
  }

  const targetStudents =
    task.targetClasses.length > 0
      ? students.filter((s) => task.targetClasses.includes(s.classLabel))
      : students;

  const nextDrafts = [...existingDrafts];
  const logItems: TaskStudentExecutionItem[] = [];
  let generatedCount = 0;

  for (const student of targetStudents) {
    // Check if student has clips within lookback window
    const freshCheck = synthesizeGrowthDraft({
      student,
      template: targetTemplates[0],
      clips,
      dateStr,
      lookbackDays: task.lookbackDays,
      taskId: task.id,
      nowTimeStr: timeClock,
    });
    if (freshCheck.sourceClipIds.length === 0) {
      continue;
    }

    for (let tIdx = 0; tIdx < targetTemplates.length; tIdx++) {
      const template = targetTemplates[tIdx];
      const freshDraft = synthesizeGrowthDraft({
        student,
        template,
        clips,
        dateStr,
        lookbackDays: task.lookbackDays,
        taskId: task.id,
        nowTimeStr: timeClock,
      });

      const existingIdx = nextDrafts.findIndex(
        (d) => d.studentId === student.id && d.templateId === template.id
      );

      if (existingIdx >= 0) {
        nextDrafts[existingIdx] = {
          ...freshDraft,
          status: nextDrafts[existingIdx].status,
        };
      } else {
        nextDrafts.unshift(freshDraft);
      }

      logItems.push({
        studentId: student.id,
        studentName: student.name,
        classLabel: student.classLabel,
        templateId: template.id,
        templateTitle: template.title,
        draftId: freshDraft.id,
        generatedAt: executedAt,
      });
      generatedCount += 1;
    }
  }

  return {
    drafts: nextDrafts,
    generatedCount,
    executionLog: {
      id: `exec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      taskId: task.id,
      executedAt,
      lookbackDays: task.lookbackDays,
      targetClasses: task.targetClasses,
      items: logItems,
    },
  };
}

const WEEKDAY_NAMES: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
};

export function formatScheduleLabel(
  task: Pick<AutomationTask, 'frequency' | 'weekdays' | 'timeStr'>
): string {
  if (task.frequency === 'daily') {
    return `每天 ${task.timeStr}`;
  }
  const sortedDays = Array.from(new Set(task.weekdays)).sort((a, b) => a - b);
  if (sortedDays.length === 0) {
    return `每周一 ${task.timeStr}`;
  }
  const dayNames = sortedDays.map((d) => WEEKDAY_NAMES[d] || `周${d}`);
  if (dayNames.length === 1) {
    return `每${dayNames[0]} ${task.timeStr}`;
  }
  const compact = dayNames
    .map((name, idx) => (idx === 0 ? name : name.replace('周', '')))
    .join('、');
  return `每${compact} ${task.timeStr}`;
}

export function formatClassCoverageLabel(targetClasses: string[]): string {
  if (!targetClasses || targetClasses.length === 0) return '全部班级';
  return targetClasses.join('、');
}

function chineseNumeralToInt(token: string): number | null {
  const clean = token.trim();
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  const digitMap: Record<string, number> = {
    零: 0,
    〇: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };
  if (clean in digitMap) return digitMap[clean];
  if (clean.startsWith('十') && clean.length === 2 && clean[1] in digitMap) {
    return 10 + digitMap[clean[1]];
  }
  if (clean.endsWith('十') && clean.length === 2 && clean[0] in digitMap) {
    return digitMap[clean[0]] * 10;
  }
  if (clean.length === 3 && clean[1] === '十') {
    const tens = digitMap[clean[0]];
    const ones = digitMap[clean[2]];
    if (tens !== undefined && ones !== undefined) {
      return tens * 10 + ones;
    }
  }
  return null;
}

export function parseVoiceScheduleCommand(
  utterance: string,
  templates: GrowthTemplate[],
  availableClasses: string[] = ['三年二班', '三年一班']
): ParsedVoiceSchedule {
  const raw = utterance.trim();

  // 1. Frequency & Weekdays
  let frequency: ScheduleFrequency = 'daily';
  const weekdayMatches: number[] = [];
  const weekdayPatterns: Array<[RegExp, number]> = [
    [/(?:每周|星期|礼拜|周)一/g, 1],
    [/(?:每周|星期|礼拜|周)二/g, 2],
    [/(?:每周|星期|礼拜|周)三/g, 3],
    [/(?:每周|星期|礼拜|周)四/g, 4],
    [/(?:每周|星期|礼拜|周)五/g, 5],
    [/(?:每周|星期|礼拜|周)六/g, 6],
    [/(?:每周|星期|礼拜|周)[日天]/g, 7],
  ];

  for (const [regex, dayNum] of weekdayPatterns) {
    if (regex.test(raw)) {
      weekdayMatches.push(dayNum);
    }
  }

  const compactWeekdayBlock = raw.match(
    /(?:每周|每逢|周|星期|礼拜)([一二三四五六日天、,，和与]+)/
  );
  if (compactWeekdayBlock) {
    const chars = compactWeekdayBlock[1];
    const mapChar: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      日: 7,
      天: 7,
    };
    for (const ch of chars) {
      if (ch in mapChar && !weekdayMatches.includes(mapChar[ch])) {
        weekdayMatches.push(mapChar[ch]);
      }
    }
  }

  if (/工作日/.test(raw)) {
    for (const d of [1, 2, 3, 4, 5]) {
      if (!weekdayMatches.includes(d)) weekdayMatches.push(d);
    }
  } else if (/周末/.test(raw)) {
    for (const d of [6, 7]) {
      if (!weekdayMatches.includes(d)) weekdayMatches.push(d);
    }
  }

  if (weekdayMatches.length > 0 || /每周|星期|礼拜/.test(raw)) {
    frequency = 'weekly';
    if (weekdayMatches.length === 0) {
      weekdayMatches.push(5);
    }
  }

  // 2. Time extraction
  let hour = 17;
  let minute = 30;
  const isAfternoonOrEvening = /(下午|傍晚|晚上|晚间|夜里)/.test(raw);
  const isNoon = /中午/.test(raw);
  const isMorning = /(早上|早晨|上午|清晨)/.test(raw);

  const colonMatch = raw.match(/(\d{1,2})\s*[:：]\s*(\d{1,2})/);
  if (colonMatch) {
    hour = parseInt(colonMatch[1], 10);
    minute = parseInt(colonMatch[2], 10);
    if (isAfternoonOrEvening && hour < 12) hour += 12;
  } else {
    const chineseTimeMatch = raw.match(
      /([零〇一二两三四五六七八九十\d]{1,3})\s*[点时](?:\s*(半)|(?:\s*([零〇一二两三四五六七八九十\d]{1,3})\s*分?))?/
    );
    if (chineseTimeMatch) {
      const parsedH = chineseNumeralToInt(chineseTimeMatch[1]);
      if (parsedH !== null && parsedH >= 0 && parsedH <= 23) {
        hour = parsedH;
        if (isAfternoonOrEvening && hour < 12) {
          hour += 12;
        } else if (isNoon && hour < 11) {
          hour += 12;
        } else if (isMorning && hour === 12) {
          hour = 0;
        }
      }
      if (chineseTimeMatch[2] === '半') {
        minute = 30;
      } else if (chineseTimeMatch[3]) {
        const parsedM = chineseNumeralToInt(chineseTimeMatch[3]);
        if (parsedM !== null && parsedM >= 0 && parsedM <= 59) {
          minute = parsedM;
        }
      } else {
        minute = 0;
      }
    }
  }

  hour = Math.max(0, Math.min(23, hour));
  minute = Math.max(0, Math.min(59, minute));
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // 3. Target Classes Coverage
  const targetClasses: string[] = [];
  if (!/全部班级|所有班级|全校|所有班/.test(raw)) {
    for (const cls of availableClasses) {
      if (raw.includes(cls)) {
        targetClasses.push(cls);
      }
    }
  }

  // 4. Lookback Days ("结合前7天", "近三天", "最近两周", "近一个月")
  let lookbackDays = 7;
  const daysMatch = raw.match(
    /(?:前|近|最近|结合前|汇总前|过去)\s*([零〇一二两三四五六七八九十\d]{1,3})\s*(天|日|周|星期|个月)/
  );
  if (daysMatch) {
    const num = chineseNumeralToInt(daysMatch[1]);
    const unit = daysMatch[2];
    if (num !== null && num > 0) {
      if (unit === '周' || unit === '星期') {
        lookbackDays = num * 7;
      } else if (unit === '个月') {
        lookbackDays = num * 30;
      } else {
        lookbackDays = num;
      }
    }
  } else if (/本周|这周|一周/.test(raw)) {
    lookbackDays = 7;
  } else if (/本月|半个月/.test(raw)) {
    lookbackDays = /半个月/.test(raw) ? 15 : 30;
  }

  // 5. Template Matching
  let matchedTemplateIds: string[] = [];
  if (/全部模板|所有模板|全都生成|都生成/.test(raw)) {
    matchedTemplateIds = templates.map((t) => t.id);
  } else {
    for (const tpl of templates) {
      const matched =
        raw.includes(tpl.title) ||
        tpl.keywords.some((kw) => kw.length > 0 && raw.includes(kw));
      if (matched) {
        matchedTemplateIds.push(tpl.id);
      }
    }
  }

  if (matchedTemplateIds.length === 0 && templates.length > 0) {
    matchedTemplateIds = [templates[0].id];
  }

  const sortedWeekdays = Array.from(new Set(weekdayMatches)).sort((a, b) => a - b);
  const scheduleLabel = formatScheduleLabel({
    frequency,
    weekdays: sortedWeekdays,
    timeStr,
  });

  const selectedTitles = templates
    .filter((t) => matchedTemplateIds.includes(t.id))
    .map((t) => t.title);

  const title =
    selectedTitles.length === 1
      ? `${selectedTitles[0]}自动生成`
      : `${frequency === 'daily' ? '每日' : '每周'}定时草稿任务`;

  return {
    title,
    frequency,
    weekdays: sortedWeekdays,
    timeStr,
    templateIds: matchedTemplateIds,
    targetClasses,
    lookbackDays,
    summaryLabel: `${scheduleLabel} · ${formatClassCoverageLabel(targetClasses)} · 前${lookbackDays}天`,
    rawCommand: raw,
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
