import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mic,
  Plus,
  Play,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  History,
  Info,
} from 'lucide-react';
import {
  formatClassCoverageLabel,
  formatScheduleLabel,
  parseVoiceScheduleCommand,
  type AutomationTask,
  type GrowthRecordDraft,
  type GrowthTemplate,
  type ScheduleFrequency,
} from '../utils/segmentLogic';

interface AutomationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: AutomationTask[];
  templates: GrowthTemplate[];
  availableClasses: string[];
  drafts: GrowthRecordDraft[];
  onAddTask: (task: AutomationTask) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onRunTaskNow: (task: AutomationTask) => number;
  onUpdateDraftContent: (draftId: string, content: string) => void;
}

const WEEKDAY_OPTIONS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 7, label: '日' },
];

const SAMPLE_VOICE_COMMANDS = [
  '每周五下午四点给三年二班结合前7天资料生成课堂观察周报和家校沟通纪要',
  '每天晚上七点半针对全部班级结合前14天整理个性化指导手记',
  '每周一、周三上午八点十五分给三年一班结合前3天生成阶段性素养评估',
];

export const AutomationConfigModal: React.FC<AutomationConfigModalProps> = ({
  isOpen,
  onClose,
  tasks,
  templates,
  availableClasses,
  drafts,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onRunTaskNow,
  onUpdateDraftContent,
}) => {
  const [voiceInput, setVoiceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [sampleIdx, setSampleIdx] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Task creation / voice-filled confirmation state
  const [draftEditorOpen, setDraftEditorOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftFrequency, setDraftFrequency] =
    useState<ScheduleFrequency>('daily');
  const [draftWeekdays, setDraftWeekdays] = useState<number[]>([5]);
  const [draftTime, setDraftTime] = useState('17:30');
  const [draftTargetClasses, setDraftTargetClasses] = useState<string[] | null>(
    null
  );
  const [draftLookbackDays, setDraftLookbackDays] = useState<number>(7);
  const [draftTemplateIds, setDraftTemplateIds] = useState<string[]>([]);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isClassMenuOpen, setIsClassMenuOpen] = useState(false);
  const [parsedFromVoice, setParsedFromVoice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Per-task execution log accordion (collapsed by default)
  const [expandedLogTaskId, setExpandedLogTaskId] = useState<string | null>(
    null
  );
  const [showConfigHint, setShowConfigHint] = useState(false);

  // Draft detail view when clicking a student item in execution log
  const [inspectingDraftId, setInspectingDraftId] = useState<string | null>(
    null
  );
  const [inspectingTime, setInspectingTime] = useState<string>('');
  const [detailContent, setDetailContent] = useState('');

  const recognitionRef = useRef<any>(null);
  const simTimerRef = useRef<number | null>(null);

  const inspectingDraft = drafts.find((d) => d.id === inspectingDraftId) || null;

  useEffect(() => {
    if (!isOpen) {
      setInspectingDraftId(null);
      setIsTemplateMenuOpen(false);
      setIsClassMenuOpen(false);
      setShowConfigHint(false);
      setExpandedLogTaskId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (simTimerRef.current) window.clearTimeout(simTimerRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    window.setTimeout(() => {
      setFeedbackMsg((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const applyParsedCommandToDraft = (rawText: string, fromVoice: boolean) => {
    const clean = rawText.trim();
    if (!clean) return;
    const parsed = parseVoiceScheduleCommand(clean, templates, availableClasses);
    setDraftTitle(parsed.title);
    setDraftFrequency(parsed.frequency);
    setDraftWeekdays(parsed.weekdays.length > 0 ? parsed.weekdays : [5]);
    setDraftTime(parsed.timeStr);
    setDraftTargetClasses(parsed.targetClasses);
    setDraftLookbackDays(parsed.lookbackDays);
    setDraftTemplateIds(parsed.templateIds);
    setParsedFromVoice(fromVoice);
    setFormError(null);
    setDraftEditorOpen(true);
  };

  const handleToggleVoiceCapture = () => {
    if (isListening) {
      if (simTimerRef.current) {
        window.clearTimeout(simTimerRef.current);
        simTimerRef.current = null;
      }
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      if (voiceInput.trim().length > 2) {
        applyParsedCommandToDraft(voiceInput, true);
      }
      return;
    }

    setIsListening(true);
    setFeedbackMsg(null);
    let capturedReal = false;

    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: any;
          webkitSpeechRecognition?: any;
        }
      ).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any })
        .webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'zh-CN';
        rec.continuous = false;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
          let txt = '';
          for (let i = 0; i < e.results.length; i++) {
            txt += e.results[i][0].transcript;
          }
          if (txt.trim()) {
            capturedReal = true;
            setVoiceInput(txt);
          }
        };
        rec.onend = () => {
          setIsListening(false);
          if (capturedReal) {
            setVoiceInput((curr) => {
              applyParsedCommandToDraft(curr, true);
              return curr;
            });
          }
        };
        rec.start();
        recognitionRef.current = rec;
      } catch {
        // fall through
      }
    }

    const phrase =
      SAMPLE_VOICE_COMMANDS[sampleIdx % SAMPLE_VOICE_COMMANDS.length];
    simTimerRef.current = window.setTimeout(() => {
      if (capturedReal) return;
      setVoiceInput(phrase);
      setIsListening(false);
      setSampleIdx((i) => (i + 1) % SAMPLE_VOICE_COMMANDS.length);
      applyParsedCommandToDraft(phrase, true);
    }, 950);
  };

  const handleOpenNewTaskForm = () => {
    setDraftTitle('新建定时任务');
    setDraftFrequency('weekly');
    setDraftWeekdays([5]);
    setDraftTime('16:30');
    setDraftTargetClasses(null);
    setDraftLookbackDays(7);
    setDraftTemplateIds([]);
    setVoiceInput('');
    setParsedFromVoice(false);
    setFormError(null);
    setIsTemplateMenuOpen(false);
    setIsClassMenuOpen(false);
    setDraftEditorOpen(true);
  };

  const toggleDraftWeekday = (day: number) => {
    setDraftWeekdays((prev) =>
      prev.includes(day)
        ? prev.length > 1
          ? prev.filter((d) => d !== day)
          : prev
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const toggleDraftClass = (cls: string) => {
    setFormError(null);
    setDraftTargetClasses((prev) => {
      const current = prev || [];
      const next = current.includes(cls)
        ? current.filter((c) => c !== cls)
        : [...current, cls];
      return next.length > 0 ? next : null;
    });
  };

  const toggleDraftTemplate = (tplId: string) => {
    setFormError(null);
    setDraftTemplateIds((prev) =>
      prev.includes(tplId)
        ? prev.filter((id) => id !== tplId)
        : [...prev, tplId]
    );
  };

  const handleConfirmSaveTask = () => {
    if (draftTargetClasses === null && draftTemplateIds.length === 0) {
      setFormError('请先选择班级和模板');
      return;
    }
    if (draftTargetClasses === null) {
      setFormError('请先选择覆盖班级');
      return;
    }
    if (draftTemplateIds.length === 0) {
      setFormError('请至少选择一个模板');
      return;
    }
    setFormError(null);
    const newTask: AutomationTask = {
      id: `task-${Date.now()}`,
      title:
        draftTitle.trim() ||
        (draftFrequency === 'daily' ? '每日定时草稿任务' : '每周定时草稿任务'),
      frequency: draftFrequency,
      weekdays: draftFrequency === 'weekly' ? draftWeekdays : [],
      timeStr: draftTime || '17:30',
      templateIds: draftTemplateIds,
      targetClasses: draftTargetClasses,
      lookbackDays: Math.max(1, draftLookbackDays || 7),
      enabled: true,
      sourceCommand: parsedFromVoice ? voiceInput.trim() : undefined,
      executionLogs: [],
    };
    onAddTask(newTask);
    setDraftEditorOpen(false);
    setIsTemplateMenuOpen(false);
    setIsClassMenuOpen(false);
    setVoiceInput('');
    setParsedFromVoice(false);
    showFeedback(`已启用：${formatScheduleLabel(newTask)}`);
  };

  const handleOpenDraftDetail = (draftId: string, generatedAt: string) => {
    const found = drafts.find((d) => d.id === draftId);
    if (!found) return;
    setInspectingDraftId(draftId);
    setInspectingTime(generatedAt);
    setDetailContent(found.content);
  };

  const selectedTemplateSummary = templates
    .filter((t) => draftTemplateIds.includes(t.id))
    .map((t) => t.title)
    .join('、');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="自动化生成"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 sm:bg-slate-900/30 sm:backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-6"
        >
          <motion.div
            initial={{ y: 24, opacity: 0.94 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#FFFFFF] text-[#111827] w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-w-lg sm:max-h-[88dvh] rounded-none sm:rounded-[28px] overflow-y-auto overscroll-contain px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7 space-y-3 sm:space-y-4 sm:shadow-2xl"
          >
            {/* ===============================================================
                SUB-VIEW: DRAFT DETAIL (from Execution Log item)
                =============================================================== */}
            {inspectingDraft ? (
              <div
                data-testid="task-log-draft-detail"
                className="space-y-4 pb-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectingDraftId(null)}
                    className="min-h-[40px] px-2 -ml-2 rounded-full text-xs font-medium text-[#111827] flex items-center gap-1 cursor-pointer hover:bg-[#F1F3F7]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>返回</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="关闭自动化生成"
                    className="w-8 h-8 -mr-1 rounded-full bg-[#F1F3F7] hover:bg-[#E7EBF2] flex items-center justify-center text-[#111827] cursor-pointer transition-colors active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="apple-ceramic-card rounded-2xl p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="text-[13px] font-semibold text-[#111827]">
                      {inspectingDraft.studentName} ·{' '}
                      {inspectingDraft.templateTitle}
                    </div>
                    <p className="font-mono text-[11px] text-[#94A3B8] tabular-nums">
                      {inspectingDraft.classLabel || '三年二班'} ·{' '}
                      {inspectingTime || inspectingDraft.updatedAt} ·{' '}
                      {inspectingDraft.sourceClipIds.length} 条
                    </p>
                  </div>

                  <textarea
                    value={detailContent}
                    onChange={(e) => setDetailContent(e.target.value)}
                    rows={6}
                    aria-label="草稿正文内容"
                    className="w-full rounded-xl bg-[#F3F5F9] border border-[#E5E9F0] p-3 text-[13.5px] leading-relaxed text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#3B66F5]/25 focus:border-[#3B66F5]/40"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      onUpdateDraftContent(inspectingDraft.id, detailContent);
                      showFeedback(
                        `已保存「${inspectingDraft.studentName} · ${inspectingDraft.templateTitle}」`
                      );
                      setInspectingDraftId(null);
                    }}
                    className="w-full min-h-[40px] rounded-xl bg-[#3B66F5] hover:bg-[#2F57E0] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>保存</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ===============================================================
                 MAIN VIEW: SPLIT AUTOMATION TASKS + INLINE TASK FORM
                 =============================================================== */
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1">
                    <h3 className="text-sm font-semibold tracking-tight text-[#111827]">
                      自动化生成
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowConfigHint((v) => !v)}
                      aria-label="查看配置说明"
                      aria-expanded={showConfigHint}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                        showConfigHint
                          ? 'bg-[#EFF4FF] text-[#3B66F5]'
                          : 'text-[#94A3B8] hover:text-[#111827]'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="关闭自动化生成"
                    className="w-8 h-8 -mr-1 rounded-full bg-[#F1F3F7] hover:bg-[#E7EBF2] flex items-center justify-center text-[#111827] cursor-pointer transition-colors active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showConfigHint && (
                  <div
                    role="note"
                    className="calendar-desk-plate rounded-xl px-3.5 py-2.5 text-[11px] leading-relaxed text-[#64748B]"
                  >
                    支持按班级与资料周期拆分任务；新增时可用语音直接识别时间、班级与参考天数，执行后点学生记录可查看或编辑草稿。
                  </div>
                )}

                {/* Task Creation Form (Contains concise inline voice entry!) */}
                <AnimatePresence>
                  {draftEditorOpen && (
                    <motion.section
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      aria-label="定时任务设置表单"
                      className="apple-ceramic-card rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#111827]">
                          {parsedFromVoice ? '请核对参数' : '新建任务'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDraftEditorOpen(false)}
                          className="text-xs text-[#64748B] hover:text-[#111827] px-1.5 py-0.5 cursor-pointer"
                        >
                          取消
                        </button>
                      </div>

                      {/* Concise Inline Voice Bar inside the Task Form */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={voiceInput}
                          onChange={(e) => setVoiceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && voiceInput.trim()) {
                              applyParsedCommandToDraft(voiceInput, true);
                            }
                          }}
                          placeholder="语音或输入规则"
                          aria-label="语音或文字规则输入"
                          className="flex-1 min-w-0 h-9 px-3 rounded-xl bg-[#F3F5F9] border border-[#E5E9F0] text-xs text-[#111827] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B66F5]/25 focus:border-[#3B66F5]/40"
                        />
                        <button
                          type="button"
                          onClick={handleToggleVoiceCapture}
                          aria-label={
                            isListening ? '停止语音识别' : '语音设定任务'
                          }
                          title="点击语音录入规则"
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors active:scale-95 ${
                            isListening
                              ? 'bg-[#FF3B30] text-white'
                              : 'bg-[#F1F3F7] hover:bg-[#E7EBF2] text-[#111827]'
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                        {voiceInput.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              applyParsedCommandToDraft(voiceInput, true)
                            }
                            className="h-9 px-3 rounded-xl bg-[#EFF4FF] hover:bg-[#E1EBFF] text-xs font-medium text-[#3B66F5] shrink-0 cursor-pointer"
                          >
                            填入
                          </button>
                        )}
                      </div>

                      {/* Frequency & Execution Time */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div
                          role="group"
                          aria-label="执行周期"
                          className="apple-recessed-track p-0.5 rounded-full flex items-center gap-0.5"
                        >
                          {(
                            [
                              { id: 'daily', label: '每天' },
                              { id: 'weekly', label: '每周' },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setDraftFrequency(opt.id)}
                              className={`min-h-[34px] px-4 py-1 rounded-full text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
                                draftFrequency === opt.id
                                  ? 'apple-pill-active text-[#111827] font-semibold'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        <input
                          type="time"
                          value={draftTime}
                          onChange={(e) => setDraftTime(e.target.value)}
                          aria-label="定时执行时间"
                          className="h-9 font-mono text-xs font-medium text-[#111827] bg-[#F3F5F9] rounded-xl px-3 border border-[#E5E9F0] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#3B66F5]/25 focus:border-[#3B66F5]/40"
                        />
                      </div>

                      {/* Weekday Selector when Weekly */}
                      {draftFrequency === 'weekly' && (
                        <div className="grid grid-cols-7 gap-1.5">
                          {WEEKDAY_OPTIONS.map((wd) => {
                            const active = draftWeekdays.includes(wd.value);
                            return (
                              <button
                                key={wd.value}
                                type="button"
                                onClick={() => toggleDraftWeekday(wd.value)}
                                aria-label={`周${wd.label}`}
                                className={`min-h-[36px] rounded-xl text-xs font-medium cursor-pointer transition-all ${
                                  active
                                    ? 'calendar-cell-active text-[#3B66F5] font-semibold'
                                    : 'bg-[#F3F5F9] hover:bg-[#EAEFF6] text-[#64748B]'
                                }`}
                              >
                                {wd.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Coverage Class Dropdown (unselected by default) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsClassMenuOpen((v) => !v);
                            setIsTemplateMenuOpen(false);
                          }}
                          aria-haspopup="listbox"
                          aria-expanded={isClassMenuOpen}
                          aria-label="选择覆盖班级"
                          className="w-full h-10 px-3 rounded-xl bg-[#F3F5F9] border border-[#E5E9F0] text-xs flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span
                            className={`truncate font-medium ${
                              draftTargetClasses === null
                                ? 'text-[#94A3B8]'
                                : 'text-[#111827]'
                            }`}
                          >
                            {draftTargetClasses === null
                              ? '选择班级'
                              : formatClassCoverageLabel(draftTargetClasses)}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                        </button>

                        {isClassMenuOpen && (
                          <div
                            role="listbox"
                            aria-multiselectable="true"
                            aria-label="班级多选列表"
                            className="w-full mt-1 rounded-xl bg-[#FFFFFF] border border-[#E5E9F0] shadow-sm p-1 space-y-0.5"
                          >
                            <button
                              type="button"
                              role="option"
                              aria-selected={
                                draftTargetClasses !== null &&
                                draftTargetClasses.length === 0
                              }
                              onClick={() => {
                                setFormError(null);
                                setDraftTargetClasses([]);
                              }}
                              className="w-full h-9 px-2.5 rounded-lg text-xs text-[#111827] flex items-center justify-between hover:bg-[#F3F5F9] cursor-pointer"
                            >
                              <span>全部班级</span>
                              {draftTargetClasses !== null &&
                                draftTargetClasses.length === 0 && (
                                  <Check className="w-3.5 h-3.5 text-[#3B66F5]" />
                                )}
                            </button>
                            {availableClasses.map((cls) => {
                              const selected =
                                draftTargetClasses !== null &&
                                draftTargetClasses.includes(cls);
                              return (
                                <button
                                  key={cls}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => toggleDraftClass(cls)}
                                  className="w-full h-9 px-2.5 rounded-lg text-xs text-[#111827] flex items-center justify-between hover:bg-[#F3F5F9] cursor-pointer"
                                >
                                  <span>{cls}</span>
                                  {selected && (
                                    <Check className="w-3.5 h-3.5 text-[#3B66F5]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Multi-Select Template Dropdown (unselected by default) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsTemplateMenuOpen((v) => !v);
                            setIsClassMenuOpen(false);
                          }}
                          aria-haspopup="listbox"
                          aria-expanded={isTemplateMenuOpen}
                          aria-label="选择成长记录模板"
                          className="w-full h-10 px-3 rounded-xl bg-[#F3F5F9] border border-[#E5E9F0] text-xs flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span
                            className={`truncate font-medium ${
                              selectedTemplateSummary
                                ? 'text-[#111827]'
                                : 'text-[#94A3B8]'
                            }`}
                          >
                            {selectedTemplateSummary || '选择模板'}
                          </span>
                          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                        </button>

                        {isTemplateMenuOpen && (
                          <div
                            role="listbox"
                            aria-multiselectable="true"
                            aria-label="成长记录模板多选下拉"
                            className="w-full mt-1 rounded-xl bg-[#FFFFFF] border border-[#E5E9F0] shadow-sm p-1 space-y-0.5"
                          >
                            {templates.map((tpl) => {
                              const selected = draftTemplateIds.includes(
                                tpl.id
                              );
                              return (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => toggleDraftTemplate(tpl.id)}
                                  className="w-full h-9 px-2.5 rounded-lg text-left flex items-center justify-between gap-2 hover:bg-[#F3F5F9] cursor-pointer"
                                >
                                  <span className="text-xs font-medium text-[#111827] truncate">
                                    {tpl.title}
                                  </span>
                                  {selected && (
                                    <Check className="w-3.5 h-3.5 text-[#3B66F5] shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Clean Inline Lookback Input: 参考前 [input] 天生成 */}
                      <div className="flex items-center gap-2 px-0.5 py-0.5 text-xs text-[#64748B]">
                        <span className="whitespace-nowrap">参考前</span>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={draftLookbackDays}
                          onChange={(e) =>
                            setDraftLookbackDays(
                              Math.max(
                                1,
                                Math.min(90, parseInt(e.target.value, 10) || 1)
                              )
                            )
                          }
                          aria-label="参考前多少天生成"
                          className="w-12 h-8 rounded-lg bg-[#F3F5F9] border border-[#E5E9F0] text-center font-mono text-xs font-semibold text-[#111827] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-[#3B66F5]/25 focus:border-[#3B66F5]/40"
                        />
                        <span className="whitespace-nowrap">天生成</span>
                      </div>

                      {formError && (
                        <p role="alert" className="text-xs text-[#FF3B30] px-0.5">
                          {formError}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleConfirmSaveTask}
                        className="w-full h-10 rounded-xl bg-[#3B66F5] hover:bg-[#2F57E0] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99] transition-all shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>确认启用</span>
                      </button>
                    </motion.section>
                  )}
                </AnimatePresence>

                {/* Feedback Banner */}
                {feedbackMsg && (
                  <div className="text-xs text-[#3B66F5] font-medium text-center py-0.5">
                    {feedbackMsg}
                  </div>
                )}

                {/* Split Automation Tasks List with Per-Student Execution Logs */}
                <section className="space-y-2.5" aria-label="已拆分的定时生成任务">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[#64748B]">
                      定时任务（{tasks.length}）
                    </span>
                    {!draftEditorOpen && (
                      <button
                        type="button"
                        onClick={handleOpenNewTaskForm}
                        className="h-8 px-3 rounded-full bg-[#EFF4FF] hover:bg-[#E1EBFF] text-xs font-medium text-[#3B66F5] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>新增</span>
                      </button>
                    )}
                  </div>

                  {tasks.length === 0 ? (
                    <div className="apple-ceramic-card rounded-2xl py-10 px-5 text-center text-xs text-[#94A3B8]">
                      暂无定时任务
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {tasks.map((task) => {
                        const tplNames = templates
                          .filter((t) => task.templateIds.includes(t.id))
                          .map((t) => t.title)
                          .join('、');
                        const isLogsOpen = expandedLogTaskId === task.id;
                        const totalLogItems = task.executionLogs.reduce(
                          (acc, log) => acc + log.items.length,
                          0
                        );

                        return (
                          <article
                            key={task.id}
                            className="apple-ceramic-card rounded-2xl px-4 py-3 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
                                  <span className="font-mono tabular-nums">
                                    {formatScheduleLabel(task)}
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="text-[#94A3B8]"
                                  >
                                    ·
                                  </span>
                                  <span>
                                    {formatClassCoverageLabel(
                                      task.targetClasses
                                    )}
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="text-[#94A3B8]"
                                  >
                                    ·
                                  </span>
                                  <span className="font-mono tabular-nums">
                                    前{task.lookbackDays}天
                                  </span>
                                </div>
                                <p className="text-xs text-[#64748B] leading-relaxed">
                                  {tplNames || '未指定'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => onToggleTask(task.id)}
                                className={`h-7 px-2.5 rounded-lg text-[11px] font-medium cursor-pointer shrink-0 transition-colors ${
                                  task.enabled
                                    ? 'bg-[#EFF4FF] text-[#3B66F5]'
                                    : 'bg-[#F1F3F7] text-[#94A3B8]'
                                }`}
                              >
                                {task.enabled ? '开启' : '暂停'}
                              </button>
                            </div>

                            {/* Action Bar: Execution Logs toggle, Run Now, Delete */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EEF1F6]">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedLogTaskId((prev) =>
                                    prev === task.id ? null : task.id
                                  )
                                }
                                aria-expanded={isLogsOpen}
                                aria-label={`查看执行记录 (${totalLogItems})`}
                                className="h-7 px-1.5 -ml-1 rounded-lg text-xs text-[#64748B] hover:text-[#111827] hover:bg-[#F1F3F7] flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span className="font-mono tabular-nums">
                                  ({totalLogItems})
                                </span>
                                {isLogsOpen ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const count = onRunTaskNow(task);
                                    setExpandedLogTaskId(task.id);
                                    showFeedback(`已生成 ${count} 份`);
                                  }}
                                  className="h-7 px-2.5 rounded-lg bg-[#F1F3F7] hover:bg-[#E7EBF2] text-[11px] font-medium text-[#111827] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>生成</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteTask(task.id)}
                                  aria-label="删除定时任务"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#FF3B30] hover:bg-[#FFF1F0] cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded Execution Logs: Per-student generation timestamps + Click into Draft Detail */}
                            {isLogsOpen && (
                              <div className="pt-2 border-t border-[#EEF1F6] space-y-2">
                                {task.executionLogs.length === 0 ? (
                                  <p className="text-[11px] text-[#94A3B8] py-1">
                                    暂无记录
                                  </p>
                                ) : (
                                  task.executionLogs.map((log) => (
                                    <div key={log.id} className="space-y-1.5">
                                      <div className="font-mono text-[11px] text-[#94A3B8] tabular-nums">
                                        {log.executedAt} · 前{log.lookbackDays}天
                                      </div>
                                      <div className="space-y-1">
                                        {log.items.map((item, idx) => {
                                          return (
                                            <button
                                              key={`${log.id}-${item.draftId}-${idx}`}
                                              type="button"
                                              onClick={() =>
                                                handleOpenDraftDetail(
                                                  item.draftId,
                                                  item.generatedAt
                                                )
                                              }
                                              className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#F7F9FC] hover:bg-[#EFF2F7] flex items-center justify-between gap-2 text-left cursor-pointer transition-colors"
                                            >
                                              <div className="min-w-0 truncate">
                                                <span className="text-xs font-medium text-[#111827]">
                                                  {item.studentName}
                                                </span>
                                                <span
                                                  aria-hidden="true"
                                                  className="text-xs text-[#94A3B8] mx-1"
                                                >
                                                  ·
                                                </span>
                                                <span className="text-xs text-[#64748B]">
                                                  {item.templateTitle}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="font-mono text-[11px] text-[#94A3B8] tabular-nums">
                                                  {item.generatedAt}
                                                </span>
                                                <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
