import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  formatFileSize,
  calculateSegmentStats,
  resolveTargetSegment,
  createRecordedClip,
  mergeClipsInSegment,
  generateAIPedagogicalAnalysis,
  appendAIEntryToSegmentNotes,
  formatFriendlyDate,
  generateCalendarMatrix,
  matchStudentFromText,
  groupClipsByStudent,
  synthesizeGrowthDraft,
  runAutomationTaskGeneration,
  parseVoiceScheduleCommand,
  formatScheduleLabel,
  isDateWithinLookback,
  type DailySegment,
  type VoiceClip,
  type StudentProfile,
  type GrowthTemplate,
  type AutomationTask,
} from './segmentLogic';

const sampleSegments: DailySegment[] = [
  {
    id: 'seg-1',
    dateStr: '2026-11-05',
    title: '片段 01',
    periodLabel: '08:30',
    notes: '初始手记',
    aiEntries: [],
  },
  {
    id: 'seg-2',
    dateStr: '2026-11-05',
    title: '片段 02',
    periodLabel: '14:00',
    notes: '',
    aiEntries: [],
  },
];

test('formatDuration formats seconds into MM:SS with tabular padding', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(9), '00:09');
  assert.equal(formatDuration(75), '01:15');
  assert.equal(formatDuration(605), '10:05');
});

test('resolveTargetSegment picks preferred segment when matching dateStr', () => {
  const res = resolveTargetSegment(sampleSegments, '2026-11-05', 'seg-1');
  assert.equal(res.createdNew, false);
  assert.equal(res.segment.id, 'seg-1');
});

test('resolveTargetSegment falls back to latest segment of same date if preferred is null', () => {
  const res = resolveTargetSegment(sampleSegments, '2026-11-05', null);
  assert.equal(res.createdNew, false);
  assert.equal(res.segment.id, 'seg-2');
});

test('resolveTargetSegment creates a new segment when date has no segments', () => {
  const res = resolveTargetSegment(sampleSegments, '2026-11-06', null, 15);
  assert.equal(res.createdNew, true);
  assert.equal(res.segment.dateStr, '2026-11-06');
  assert.equal(res.segment.title, '片段 01');
  assert.equal(res.segment.periodLabel, '15:00');
});

test('createRecordedClip and calculateSegmentStats accurately track clips in a segment', () => {
  const c1 = createRecordedClip({
    segmentId: 'seg-2',
    dateStr: '2026-11-05',
    transcript: '今天下午先把核心交互原型定下来，再去对齐底层接口。',
    durationSec: 18,
    audioSource: 'simulated',
    timestampStr: '09:46:12',
  });
  const c2 = createRecordedClip({
    segmentId: 'seg-2',
    dateStr: '2026-11-05',
    transcript: '晚上八点前完成最终版本的确认。',
    durationSec: 12,
    audioSource: 'simulated',
    timestampStr: '09:48:00',
  });
  c2.starred = true;

  const stats = calculateSegmentStats([c1, c2], 'seg-2');
  assert.equal(stats.clipCount, 2);
  assert.equal(stats.totalDurationSec, 30);
  assert.equal(stats.starredCount, 1);
  assert.equal(
    stats.totalCharacters,
    c1.transcript.length + c2.transcript.length
  );
});

test('mergeClipsInSegment combines selected clips into a single clip preserving order', () => {
  const clips: VoiceClip[] = [
    createRecordedClip({
      segmentId: 'seg-2',
      dateStr: '2026-11-05',
      transcript: '第一段话。',
      durationSec: 10,
      audioSource: 'simulated',
    }),
    createRecordedClip({
      segmentId: 'seg-2',
      dateStr: '2026-11-05',
      transcript: '第二段话。',
      durationSec: 15,
      audioSource: 'simulated',
    }),
  ];
  const merged = mergeClipsInSegment(clips, [clips[0].id, clips[1].id]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].durationSec, 25);
  assert.equal(merged[0].transcript, '第一段话。 第二段话。');
});

test('generateAIPedagogicalAnalysis and appendAIEntryToSegmentNotes write structured analysis back to segment', () => {
  const clip = createRecordedClip({
    segmentId: 'seg-2',
    dateStr: '2026-11-05',
    transcript: '先把上午整理的语音片段汇总成一份简明纪要。',
    durationSec: 22,
    audioSource: 'simulated',
  });

  const entry = generateAIPedagogicalAnalysis({
    segment: sampleSegments[1],
    clips: [clip],
    presetId: 'summary',
  });

  assert.ok(entry.content.includes('片段 02'));
  assert.ok(entry.content.includes('简明纪要'));
  assert.equal(entry.basedOnClipIds.length, 1);

  const updatedNotes = appendAIEntryToSegmentNotes('原有手记', entry);
  assert.ok(updatedNotes.includes('原有手记'));
  assert.ok(updatedNotes.includes(entry.content));
});

test('formatFriendlyDate correctly formats today, yesterday, and arbitrary dates', () => {
  assert.equal(formatFriendlyDate('2026-11-05', '2026-11-05'), '今天 · 11月5日');
  assert.equal(formatFriendlyDate('2026-11-04', '2026-11-05'), '昨天 · 11月4日');
  assert.equal(formatFriendlyDate('2026-11-03', '2026-11-05'), '前天 · 11月3日');
  assert.ok(formatFriendlyDate('2026-10-30', '2026-11-05').includes('10月30日'));
});

test('generateCalendarMatrix generates correct grid for November 2026', () => {
  const matrix = generateCalendarMatrix(2026, 11, '2026-11-05');
  assert.ok(matrix.length >= 35);
  const nov5 = matrix.find((d: any) => d.dateStr === '2026-11-05');
  assert.ok(nov5);
  assert.equal(nov5.isToday, true);
  assert.equal(nov5.isCurrentMonth, true);
});

test('formatFileSize formats bytes into readable units', () => {
  assert.equal(formatFileSize(0), '0 KB');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(2048), '2 KB');
  assert.equal(formatFileSize(1.5 * 1024 * 1024), '1.5 MB');
});

test('createRecordedClip supports video and uploaded file metadata', () => {
  const videoClip = createRecordedClip({
    segmentId: 'seg-1',
    dateStr: '2026-11-12',
    transcript: '板书推导过程录像记录。',
    durationSec: 15,
    audioSource: 'camera',
    mediaType: 'video',
    fileName: '课堂片段_01.webm',
  });
  assert.equal(videoClip.mediaType, 'video');
  assert.equal(videoClip.fileName, '课堂片段_01.webm');

  const fileClip = createRecordedClip({
    segmentId: 'seg-1',
    dateStr: '2026-11-12',
    transcript: '已上传音频文件，等待后续整理。',
    durationSec: 42,
    audioSource: 'upload',
    mediaType: 'file',
    fileName: '教研会议纪要.mp3',
    fileSizeLabel: '2.4 MB',
  });
  assert.equal(fileClip.mediaType, 'file');
  assert.equal(fileClip.fileSizeLabel, '2.4 MB');
});

const sampleStudents: StudentProfile[] = [
  { id: 'stu-lin', name: '林子涵', classLabel: '三年二班' },
  { id: 'stu-chen', name: '陈思琪', classLabel: '三年一班' },
];

const sampleTemplates: GrowthTemplate[] = [
  {
    id: 'tpl-weekly-obs',
    title: '课堂观察周报',
    summaryHint: '课堂观察',
    keywords: ['课堂观察', '周报'],
  },
  {
    id: 'tpl-home-school',
    title: '家校沟通纪要',
    summaryHint: '家校沟通',
    keywords: ['家校', '家长'],
  },
  {
    id: 'tpl-coaching',
    title: '个性化指导手记',
    summaryHint: '个性辅导',
    keywords: ['指导', '辅导', '手记'],
  },
];

test('matchStudentFromText and groupClipsByStudent attribute clips per student', () => {
  const matched = matchStudentFromText('今天林子涵在小组里主动总结实验数据', sampleStudents);
  assert.equal(matched?.id, 'stu-lin');

  const c1 = createRecordedClip({
    segmentId: 'seg-1',
    dateStr: '2026-11-05',
    transcript: '林子涵课堂笔记非常仔细。',
    durationSec: 12,
    audioSource: 'simulated',
    timestampStr: '09:30:00',
  });
  const c2 = createRecordedClip({
    segmentId: 'seg-1',
    dateStr: '2026-11-05',
    transcript: '今天下午全班开展阅读分享活动。',
    durationSec: 18,
    audioSource: 'simulated',
    timestampStr: '14:10:00',
  });

  const groups = groupClipsByStudent([c1, c2], sampleStudents);
  const linGroup = groups.find((g) => g.student.id === 'stu-lin');
  const unassigned = groups.find((g) => g.student.id === 'unassigned');

  assert.equal(linGroup?.clips.length, 1);
  assert.equal(linGroup?.totalDurationSec, 12);
  assert.equal(unassigned?.clips.length, 1);
});

test('isDateWithinLookback and runAutomationTaskGeneration respect class coverage and lookbackDays with execution logs', () => {
  assert.equal(isDateWithinLookback('2026-11-05', '2026-11-05', 3), true);
  assert.equal(isDateWithinLookback('2026-11-03', '2026-11-05', 3), true);
  assert.equal(isDateWithinLookback('2026-11-01', '2026-11-05', 3), false);

  const cRecentLin = createRecordedClip({
    segmentId: 'seg-1',
    dateStr: '2026-11-05',
    transcript: '林子涵今天主动解答了两道探究题。',
    durationSec: 15,
    audioSource: 'simulated',
    studentId: 'stu-lin',
    studentName: '林子涵',
  });
  const cOldLin = createRecordedClip({
    segmentId: 'seg-2',
    dateStr: '2026-10-20',
    transcript: '林子涵十月份的旧记录。',
    durationSec: 10,
    audioSource: 'simulated',
    studentId: 'stu-lin',
    studentName: '林子涵',
  });
  const cChenClass1 = createRecordedClip({
    segmentId: 'seg-1',
    dateStr: '2026-11-05',
    transcript: '陈思琪今天朗读很流利。',
    durationSec: 12,
    audioSource: 'simulated',
    studentId: 'stu-chen',
    studentName: '陈思琪',
  });

  const draft = synthesizeGrowthDraft({
    student: sampleStudents[0],
    template: sampleTemplates[0],
    clips: [cRecentLin, cOldLin],
    dateStr: '2026-11-05',
    lookbackDays: 7,
    nowTimeStr: '17:30',
  });

  assert.equal(draft.templateTitle, '课堂观察周报');
  assert.ok(draft.content.includes('林子涵'));
  assert.deepEqual(draft.sourceClipIds, [cRecentLin.id]);

  const task: AutomationTask = {
    id: 'task-1',
    title: '三年二班近7天生成',
    frequency: 'daily',
    weekdays: [],
    timeStr: '17:30',
    templateIds: ['tpl-weekly-obs', 'tpl-home-school'],
    targetClasses: ['三年二班'],
    lookbackDays: 7,
    enabled: true,
    executionLogs: [],
  };

  const result = runAutomationTaskGeneration({
    task,
    students: sampleStudents,
    templates: sampleTemplates,
    clips: [cRecentLin, cOldLin, cChenClass1],
    existingDrafts: [],
    dateStr: '2026-11-05',
    nowTimeStr: '17:30',
  });

  // Only stu-lin (三年二班) should be generated, not stu-chen (三年一班)
  assert.equal(result.generatedCount, 2);
  assert.equal(result.drafts.length, 2);
  assert.equal(result.executionLog.items.length, 2);
  assert.equal(result.executionLog.items[0].studentName, '林子涵');
  assert.equal(result.executionLog.items[0].generatedAt, '11-05 17:30');
});

test('parseVoiceScheduleCommand parses class coverage, lookbackDays, schedules, and templates', () => {
  const daily = parseVoiceScheduleCommand(
    '每天下午五点半给三年二班结合前7天资料把课堂观察周报和家校沟通生成草稿',
    sampleTemplates,
    ['三年二班', '三年一班']
  );
  assert.equal(daily.frequency, 'daily');
  assert.equal(daily.timeStr, '17:30');
  assert.deepEqual(daily.targetClasses, ['三年二班']);
  assert.equal(daily.lookbackDays, 7);
  assert.deepEqual(daily.templateIds, ['tpl-weekly-obs', 'tpl-home-school']);
  assert.equal(
    formatScheduleLabel({
      frequency: daily.frequency,
      weekdays: daily.weekdays,
      timeStr: daily.timeStr,
    }),
    '每天 17:30'
  );

  const weekly = parseVoiceScheduleCommand(
    '每周一、周五晚上8点15分针对全部班级结合近14天生成个性化指导手记',
    sampleTemplates,
    ['三年二班', '三年一班']
  );
  assert.equal(weekly.frequency, 'weekly');
  assert.deepEqual(weekly.weekdays, [1, 5]);
  assert.equal(weekly.timeStr, '20:15');
  assert.deepEqual(weekly.targetClasses, []);
  assert.equal(weekly.lookbackDays, 14);
  assert.deepEqual(weekly.templateIds, ['tpl-coaching']);
});



