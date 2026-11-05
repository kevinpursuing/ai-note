import type {
  DailySegment,
  VoiceClip,
} from './segmentLogic';

export interface SimulatedSpeechScript {
  id: string;
  text: string;
}

export const SIMULATED_SPEECH_SCRIPTS: SimulatedSpeechScript[] = [
  {
    id: 'script-daily-1',
    text: '刚才突然想到一个很重要的细节，关于这周整体的推进节奏，我们需要先把核心交互原型定下来，再去对齐底层的接口字段，下午沟通的时候重点同步一下这个逻辑。',
  },
  {
    id: 'script-daily-2',
    text: '记录一下刚刚复盘出来的几个关键想法：第一点是把首屏所有的冗余干扰项全部拿掉，只保留最纯粹的触发动作；第二点是让实时字幕从左到右再向下自然流淌。',
  },
  {
    id: 'script-daily-3',
    text: '今天下午需要处理的几件事：先把上午收录的语音片段汇总成一份简明纪要，然后把核心待办事项同步到备忘录里，晚上八点前完成最终确认。',
  },
];

export const INITIAL_DATE_LIST = [
  { dateStr: '2026-11-05', label: '今天', weekday: '11月5日' },
  { dateStr: '2026-11-04', label: '昨天', weekday: '11月4日' },
  { dateStr: '2026-11-03', label: '前天', weekday: '11月3日' },
  { dateStr: '2026-11-01', label: '11月1日', weekday: '11月1日' },
  { dateStr: '2026-10-30', label: '10月30日', weekday: '10月30日' },
  { dateStr: '2026-10-28', label: '10月28日', weekday: '10月28日' },
];

export const INITIAL_SEGMENTS: DailySegment[] = [
  {
    id: 'seg-20261105-01',
    dateStr: '2026-11-05',
    title: '今日片段',
    periodLabel: '09:15',
    notes: '',
    aiEntries: [],
  },
  {
    id: 'seg-20261104-01',
    dateStr: '2026-11-04',
    title: '昨日片段',
    periodLabel: '10:30',
    notes: '',
    aiEntries: [],
  },
  {
    id: 'seg-20261103-01',
    dateStr: '2026-11-03',
    title: '11月3日片段',
    periodLabel: '16:10',
    notes: '',
    aiEntries: [],
  },
  {
    id: 'seg-20261101-01',
    dateStr: '2026-11-01',
    title: '11月1日片段',
    periodLabel: '09:00',
    notes: '',
    aiEntries: [],
  },
  {
    id: 'seg-20261030-01',
    dateStr: '2026-10-30',
    title: '10月30日片段',
    periodLabel: '14:20',
    notes: '',
    aiEntries: [],
  },
  {
    id: 'seg-20261028-01',
    dateStr: '2026-10-28',
    title: '10月28日片段',
    periodLabel: '11:15',
    notes: '',
    aiEntries: [],
  },
];

export const INITIAL_CLIPS: VoiceClip[] = [
  {
    id: 'clip-seed-101',
    segmentId: 'seg-20261105-01',
    dateStr: '2026-11-05',
    createdAt: '09:42',
    durationSec: 12,
    transcript:
      '长按说话的时候，字幕从左往右自然浮现再向下换行，松开手指后直接归档到当天的片段里。',
    starred: false,
    audioSource: 'simulated',
    confidence: 0.98,
    waveformPeaks: [
      28, 49, 64, 81, 56, 43, 72, 85, 60, 48, 77, 63, 39, 54, 70, 88, 51, 46,
      62, 74, 49, 37, 29, 24,
    ],
  },
  {
    id: 'clip-seed-102',
    segmentId: 'seg-20261105-01',
    dateStr: '2026-11-05',
    createdAt: '09:18',
    durationSec: 16,
    transcript:
      '今天把整个界面的视觉层级重新梳理了一遍，拿掉所有不必要的文字，只留下一个纯粹的实体触感按钮。',
    starred: true,
    audioSource: 'simulated',
    confidence: 0.99,
    waveformPeaks: [
      34, 62, 78, 45, 88, 52, 67, 91, 40, 58, 76, 84, 38, 69, 73, 50, 82, 64,
      47, 79, 55, 68, 42, 31,
    ],
  },
  {
    id: 'clip-seed-103',
    segmentId: 'seg-20261104-01',
    dateStr: '2026-11-04',
    createdAt: '14:25',
    durationSec: 15,
    transcript:
      '下午需要把这两段语音整理成结构化的执行清单，重点确认一下流式回调的响应速度。',
    starred: true,
    audioSource: 'simulated',
    confidence: 0.99,
    waveformPeaks: [
      42, 71, 65, 84, 59, 44, 78, 92, 53, 61, 80, 47, 68, 75, 49, 86, 62, 55,
      73, 48, 60, 41, 35, 27,
    ],
  },
  {
    id: 'clip-seed-104',
    segmentId: 'seg-20261104-01',
    dateStr: '2026-11-04',
    createdAt: '10:35',
    durationSec: 14,
    transcript:
      '昨天的录音片段已经全部整理完毕，关键灵感都按时间顺序自动收录归档。',
    starred: false,
    audioSource: 'simulated',
    confidence: 0.97,
    waveformPeaks: [
      30, 52, 68, 74, 48, 63, 81, 57, 45, 70, 66, 51, 79, 84, 49, 61, 55, 72,
      44, 58, 39, 33, 28, 22,
    ],
  },
  {
    id: 'clip-seed-105',
    segmentId: 'seg-20261103-01',
    dateStr: '2026-11-03',
    createdAt: '16:12',
    durationSec: 11,
    transcript:
      '保持极简的设计语言，不给用户增加任何认知负担，点开即录，松手即存。',
    starred: false,
    audioSource: 'simulated',
    confidence: 0.98,
    waveformPeaks: [
      25, 48, 62, 70, 54, 41, 68, 77, 52, 44, 63, 59, 38, 49, 66, 73, 47, 42,
      58, 64, 45, 36, 28, 20,
    ],
  },
  {
    id: 'clip-seed-106',
    segmentId: 'seg-20261101-01',
    dateStr: '2026-11-01',
    createdAt: '09:05',
    durationSec: 21,
    transcript:
      '十一月初启动新一轮体验迭代，把声学点阵光晕和陶瓷凹槽微光结合，做成如同实体硬件般的手感。',
    starred: true,
    audioSource: 'simulated',
    confidence: 0.99,
    waveformPeaks: [
      35, 58, 72, 80, 64, 51, 78, 89, 62, 54, 73, 69, 48, 59, 76, 83, 57, 52,
      68, 74, 55, 46, 38, 30,
    ],
  },
  {
    id: 'clip-seed-107',
    segmentId: 'seg-20261030-01',
    dateStr: '2026-10-30',
    createdAt: '14:28',
    durationSec: 18,
    transcript:
      '十月末团队小结：移动端录音首要保证单手大拇指按压时的物理触感稳定，不能有视觉晃动。',
    starred: false,
    audioSource: 'simulated',
    confidence: 0.98,
    waveformPeaks: [
      29, 44, 61, 75, 59, 46, 70, 82, 58, 49, 68, 64, 43, 54, 71, 79, 53, 48,
      63, 69, 50, 41, 33, 26,
    ],
  },
  {
    id: 'clip-seed-108',
    segmentId: 'seg-20261028-01',
    dateStr: '2026-10-28',
    createdAt: '11:20',
    durationSec: 14,
    transcript:
      '尝试设计一种拟物的永续台历，每个有语音片段的日期下方附带声学红点指示。',
    starred: false,
    audioSource: 'simulated',
    confidence: 0.97,
    waveformPeaks: [
      24, 42, 58, 69, 53, 40, 65, 76, 51, 43, 62, 57, 39, 48, 66, 72, 47, 41,
      56, 62, 45, 36, 28, 22,
    ],
  },
];
