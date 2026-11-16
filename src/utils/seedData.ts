import type {
  AutomationTask,
  DailySegment,
  GrowthRecordDraft,
  GrowthTemplate,
  StudentProfile,
  VoiceClip,
} from './segmentLogic';

export interface SimulatedSpeechScript {
  id: string;
  text: string;
}

export const SIMULATED_SPEECH_SCRIPTS: SimulatedSpeechScript[] = [
  {
    id: 'script-daily-1',
    text: '林子涵今天在小组讨论环节主动担任记录员，能清晰归纳出三组实验数据的差异，思路比上周更加连贯。',
  },
  {
    id: 'script-daily-2',
    text: '陈思琪下午朗读课文时节奏把握很稳，但遇到长句断句处还略显急促，课后可以单独带她练两遍呼吸停顿。',
  },
  {
    id: 'script-daily-3',
    text: '周宇轩今天数学板演主动上台补充了第二种解法，自信心明显提升，建议周五和家长同步这一进步亮点。',
  },
];

export const INITIAL_STUDENTS: StudentProfile[] = [
  { id: 'stu-lin', name: '林子涵', classLabel: '三年二班' },
  { id: 'stu-chen', name: '陈思琪', classLabel: '三年二班' },
  { id: 'stu-zhou', name: '周宇轩', classLabel: '三年一班' },
  { id: 'stu-zhang', name: '张若曦', classLabel: '三年一班' },
];

export const INITIAL_GROWTH_TEMPLATES: GrowthTemplate[] = [
  {
    id: 'tpl-weekly-obs',
    title: '课堂观察周报',
    summaryHint: '汇总本周课堂参与度、互动亮点与习惯表现',
    keywords: ['课堂观察', '观察周报', '周报', '课堂表现', '课堂'],
  },
  {
    id: 'tpl-home-school',
    title: '家校沟通纪要',
    summaryHint: '生成温和具象的家长反馈与协同建议',
    keywords: ['家校沟通', '家校', '家长', '沟通纪要', '反馈'],
  },
  {
    id: 'tpl-coaching',
    title: '个性化指导手记',
    summaryHint: '提炼学生薄弱点与下一阶段分层辅导措施',
    keywords: ['个性化', '指导手记', '辅导', '手记', '薄弱'],
  },
  {
    id: 'tpl-milestone',
    title: '阶段性素养评估',
    summaryHint: '综合多次随堂与作业表现形成阶段评价',
    keywords: ['阶段性', '素养评估', '评估', '阶段评价', '综合'],
  },
];

export const INITIAL_AUTOMATION_TASKS: AutomationTask[] = [
  {
    id: 'task-daily-wrap',
    title: '三年二班每日观察整理',
    frequency: 'daily',
    weekdays: [],
    timeStr: '17:30',
    templateIds: ['tpl-weekly-obs', 'tpl-coaching'],
    targetClasses: ['三年二班'],
    lookbackDays: 7,
    enabled: true,
    lastRunAt: '11-05 17:30',
    executionLogs: [
      {
        id: 'exec-seed-01',
        taskId: 'task-daily-wrap',
        executedAt: '11-05 17:30',
        lookbackDays: 7,
        targetClasses: ['三年二班'],
        items: [
          {
            studentId: 'stu-lin',
            studentName: '林子涵',
            classLabel: '三年二班',
            templateId: 'tpl-weekly-obs',
            templateTitle: '课堂观察周报',
            draftId: 'draft-stu-lin-tpl-weekly-obs',
            generatedAt: '11-05 17:30',
          },
          {
            studentId: 'stu-chen',
            studentName: '陈思琪',
            classLabel: '三年二班',
            templateId: 'tpl-coaching',
            templateTitle: '个性化指导手记',
            draftId: 'draft-stu-chen-tpl-coaching',
            generatedAt: '11-05 17:30',
          },
        ],
      },
    ],
  },
  {
    id: 'task-weekly-friday',
    title: '全年级每周五家校汇总',
    frequency: 'weekly',
    weekdays: [5],
    timeStr: '16:00',
    templateIds: ['tpl-home-school', 'tpl-milestone'],
    targetClasses: [],
    lookbackDays: 14,
    enabled: true,
    lastRunAt: '11-04 16:00',
    executionLogs: [
      {
        id: 'exec-seed-02',
        taskId: 'task-weekly-friday',
        executedAt: '11-04 16:00',
        lookbackDays: 14,
        targetClasses: [],
        items: [
          {
            studentId: 'stu-zhou',
            studentName: '周宇轩',
            classLabel: '三年一班',
            templateId: 'tpl-home-school',
            templateTitle: '家校沟通纪要',
            draftId: 'draft-stu-zhou-tpl-home-school',
            generatedAt: '11-04 16:00',
          },
          {
            studentId: 'stu-zhang',
            studentName: '张若曦',
            classLabel: '三年一班',
            templateId: 'tpl-milestone',
            templateTitle: '阶段性素养评估',
            draftId: 'draft-stu-zhang-tpl-milestone',
            generatedAt: '11-03 16:00',
          },
        ],
      },
    ],
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
    durationSec: 14,
    studentId: 'stu-lin',
    studentName: '林子涵',
    transcript:
      '林子涵上午在科学探究课主动负责小组记录，能准确区分控制变量和实验结论，表达比上周更加有条理。',
    starred: true,
    audioSource: 'simulated',
    mediaType: 'audio',
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
    studentId: 'stu-chen',
    studentName: '陈思琪',
    transcript:
      '陈思琪早读时情感很饱满，但长段落之间的停顿略短，午休后可以找她单独示范两句重音和换气节奏。',
    starred: false,
    audioSource: 'simulated',
    mediaType: 'audio',
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
    studentId: 'stu-zhou',
    studentName: '周宇轩',
    transcript:
      '周宇轩在数学应用题讲评环节主动举手提出画线段图的方法，帮同桌理清了数量关系，值得家校反馈表扬。',
    starred: true,
    audioSource: 'simulated',
    mediaType: 'audio',
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
    studentId: 'stu-lin',
    studentName: '林子涵',
    transcript:
      '林子涵昨天的自然观察笔记画得非常细致，还自主标注了叶片脉络变化，可以放进本月成长袋展示。',
    starred: false,
    audioSource: 'upload',
    mediaType: 'file',
    fileName: '林子涵_科学实验观察手稿.pdf',
    fileSizeLabel: '1.8 MB',
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
    studentId: 'stu-zhang',
    studentName: '张若曦',
    transcript:
      '张若曦课间主动协助整理图书角绘本分类，在团队协作中展现出很强的耐心与秩序感。',
    starred: false,
    audioSource: 'camera',
    mediaType: 'video',
    fileName: '张若曦_图书角整理实录.webm',
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
    studentId: 'stu-chen',
    studentName: '陈思琪',
    transcript:
      '陈思琪周末作业的古诗配画富有想象力，建议在课堂分享环节鼓励她多讲两句创作背后的小故事。',
    starred: true,
    audioSource: 'simulated',
    mediaType: 'audio',
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
    studentId: 'stu-zhou',
    studentName: '周宇轩',
    transcript:
      '十月末阶段回顾：周宇轩对几何图形拼接兴趣浓厚，不过计算步骤偶尔粗心漏写单位，需要持续提醒。',
    starred: false,
    audioSource: 'simulated',
    mediaType: 'audio',
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
    studentId: 'stu-zhang',
    studentName: '张若曦',
    transcript:
      '张若曦本周开始尝试在班会课脱稿发言，声音虽然偏轻但逻辑清楚，可以多给予正向眼神鼓励。',
    starred: false,
    audioSource: 'simulated',
    mediaType: 'audio',
    confidence: 0.97,
    waveformPeaks: [
      24, 42, 58, 69, 53, 40, 65, 76, 51, 43, 62, 57, 39, 48, 66, 72, 47, 41,
      56, 62, 45, 36, 28, 22,
    ],
  },
];

export const INITIAL_GROWTH_DRAFTS: GrowthRecordDraft[] = [
  {
    id: 'draft-stu-lin-tpl-weekly-obs',
    studentId: 'stu-lin',
    studentName: '林子涵',
    classLabel: '三年二班',
    templateId: 'tpl-weekly-obs',
    templateTitle: '课堂观察周报',
    dateStr: '2026-11-05',
    updatedAt: '17:30',
    content:
      '本周林子涵（三年二班）课堂探究与合作表现突出。结合近7天2条随堂实录观察：林子涵上午在科学探究课主动负责小组记录，能准确区分控制变量与实验结论；自然观察手稿脉络标注细致，建议收录入月度成长档案。',
    sourceClipIds: ['clip-seed-101', 'clip-seed-104'],
    generatedByTaskId: 'task-daily-wrap',
    status: 'draft',
  },
  {
    id: 'draft-stu-zhou-tpl-home-school',
    studentId: 'stu-zhou',
    studentName: '周宇轩',
    classLabel: '三年一班',
    templateId: 'tpl-home-school',
    templateTitle: '家校沟通纪要',
    dateStr: '2026-11-04',
    updatedAt: '16:00',
    content:
      '家长您好，结合近14天记录跟进同步周宇轩本周课堂亮点：数学应用题讲评时主动用画线段图的方法帮同桌梳理解题思路，理解力与自信心都在稳步增强。日常做题时可提醒他留意结尾单位书写。',
    sourceClipIds: ['clip-seed-103', 'clip-seed-107'],
    generatedByTaskId: 'task-weekly-friday',
    status: 'draft',
  },
  {
    id: 'draft-stu-chen-tpl-coaching',
    studentId: 'stu-chen',
    studentName: '陈思琪',
    classLabel: '三年二班',
    templateId: 'tpl-coaching',
    templateTitle: '个性化指导手记',
    dateStr: '2026-11-05',
    updatedAt: '17:30',
    content:
      '结合近7天早读朗读音频与古诗配画记录：陈思琪语言感染力和画面想象力很强，当前主要优化点是长句之间的换气与停顿节奏，建议下周课前安排两次1对1范读跟练，并在分享环节给予口头讲述机会。',
    sourceClipIds: ['clip-seed-102', 'clip-seed-106'],
    generatedByTaskId: 'task-daily-wrap',
    status: 'draft',
  },
  {
    id: 'draft-stu-zhang-tpl-milestone',
    studentId: 'stu-zhang',
    studentName: '张若曦',
    classLabel: '三年一班',
    templateId: 'tpl-milestone',
    templateTitle: '阶段性素养评估',
    dateStr: '2026-11-03',
    updatedAt: '16:00',
    content:
      '综合近14天班会脱稿发言与图书角整理录像记录：张若曦具备良好的集体责任感与规则意识，公开表达逐步摆脱念稿依赖，下一步可通过小组领读进一步提升音量与表现力。',
    sourceClipIds: ['clip-seed-105', 'clip-seed-108'],
    generatedByTaskId: 'task-weekly-friday',
    status: 'draft',
  },
  {
    id: 'record-stu-lin-tpl-home-school-prev',
    studentId: 'stu-lin',
    studentName: '林子涵',
    classLabel: '三年二班',
    templateId: 'tpl-home-school',
    templateTitle: '家校沟通纪要',
    dateStr: '2026-11-02',
    updatedAt: '18:10',
    publishedAt: '18:15',
    content:
      '家长您好，上周科学探究课林子涵已能主动配合同伴完成实验器材归位，动手记录认真细致。本周我们重点引导他在小组汇报时提高表达音量，欢迎在家多鼓励他复述课堂小实验。',
    sourceClipIds: ['clip-seed-104'],
    generatedByTaskId: 'task-daily-wrap',
    status: 'published',
  },
  {
    id: 'record-stu-chen-tpl-weekly-obs-prev',
    studentId: 'stu-chen',
    studentName: '陈思琪',
    classLabel: '三年二班',
    templateId: 'tpl-weekly-obs',
    templateTitle: '课堂观察周报',
    dateStr: '2026-11-01',
    updatedAt: '17:20',
    publishedAt: '17:25',
    content:
      '陈思琪本周古诗配画与晨读展示极具感染力，语言画面感突出。课堂中积极举手分享创意故事，建议继续保持诵读节奏训练，进一步提升长句换气的稳定性。',
    sourceClipIds: ['clip-seed-106'],
    generatedByTaskId: 'task-daily-wrap',
    status: 'published',
  },
];
