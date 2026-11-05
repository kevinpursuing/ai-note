import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  calculateSegmentStats,
  resolveTargetSegment,
  createRecordedClip,
  mergeClipsInSegment,
  generateAIPedagogicalAnalysis,
  appendAIEntryToSegmentNotes,
  formatFriendlyDate,
  generateCalendarMatrix,
  type DailySegment,
  type VoiceClip,
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

