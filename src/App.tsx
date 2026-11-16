import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X } from 'lucide-react';
import {
  resolveTargetSegment,
  createRecordedClip,
  matchStudentFromText,
  synthesizeGrowthDraft,
  runAutomationTaskGeneration,
  type AutomationTask,
  type DailySegment,
  type GrowthRecordDraft,
  type VoiceClip,
} from './utils/segmentLogic';
import {
  INITIAL_AUTOMATION_TASKS,
  INITIAL_CLIPS,
  INITIAL_GROWTH_DRAFTS,
  INITIAL_GROWTH_TEMPLATES,
  INITIAL_SEGMENTS,
  INITIAL_STUDENTS,
} from './utils/seedData';
import { TactileRecorderDeck } from './components/TactileRecorderDeck';
import { SegmentManagerPanel } from './components/SegmentManagerPanel';

const STORAGE_KEYS = {
  SEGMENTS: 'teacher_voice_lab_segments_v7',
  CLIPS: 'teacher_voice_lab_clips_v7',
  DRAFTS: 'teacher_voice_lab_drafts_v8',
  TASKS: 'teacher_voice_lab_tasks_v7',
};

export default function App() {
  const [segments, setSegments] = useState<DailySegment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEGMENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SEGMENTS;
  });

  const [clips, setClips] = useState<VoiceClip[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_CLIPS;
  });

  const [drafts, setDrafts] = useState<GrowthRecordDraft[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DRAFTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_GROWTH_DRAFTS;
  });

  const [automationTasks, setAutomationTasks] = useState<AutomationTask[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_AUTOMATION_TASKS;
  });

  const students = INITIAL_STUDENTS;
  const templates = INITIAL_GROWTH_TEMPLATES;

  const [selectedDate, setSelectedDate] = useState<string>('2026-11-05');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(segments));
    } catch {
      // ignore
    }
  }, [segments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIPS, JSON.stringify(clips));
    } catch {
      // ignore
    }
  }, [clips]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
    } catch {
      // ignore
    }
  }, [drafts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(automationTasks));
    } catch {
      // ignore
    }
  }, [automationTasks]);

  const activeSegment = useMemo(() => {
    const found = segments.find((s) => s.dateStr === selectedDate);
    return found || segments[0];
  }, [segments, selectedDate]);

  const clipsForSelectedDate = useMemo(
    () => clips.filter((c) => c.dateStr === selectedDate),
    [clips, selectedDate]
  );

  const todayClipsCount = useMemo(
    () => clips.filter((c) => c.dateStr === '2026-11-05').length,
    [clips]
  );

  const handleFinishRecording = (params: {
    transcript: string;
    durationSec: number;
    audioSource: 'mic' | 'simulated' | 'camera' | 'upload';
    mediaType?: 'audio' | 'video' | 'file';
    mediaUrl?: string;
    fileName?: string;
    fileSizeLabel?: string;
  }) => {
    const targetDate = '2026-11-05';
    const resolution = resolveTargetSegment(segments, targetDate, null);

    if (resolution.createdNew) {
      setSegments((prev) => [...prev, resolution.segment]);
    }

    const matchedStudent = matchStudentFromText(
      `${params.transcript} ${params.fileName || ''}`,
      students
    );

    const newClip = createRecordedClip({
      segmentId: resolution.segment.id,
      dateStr: targetDate,
      transcript: params.transcript,
      durationSec: params.durationSec,
      audioSource: params.audioSource,
      mediaType: params.mediaType,
      mediaUrl: params.mediaUrl,
      fileName: params.fileName,
      fileSizeLabel: params.fileSizeLabel,
      studentId: matchedStudent?.id,
      studentName: matchedStudent?.name,
    });

    setClips((prev) => [newClip, ...prev]);
    setSelectedDate(targetDate);
  };

  const handleAssignClipStudent = (clipId: string, studentId: string) => {
    const found = students.find((s) => s.id === studentId);
    setClips((prev) =>
      prev.map((c) =>
        c.id === clipId
          ? {
              ...c,
              studentId: found?.id,
              studentName: found?.name,
            }
          : c
      )
    );
  };

  const handleUpdateDraftContent = (draftId: string, content: string) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? {
              ...d,
              content: content.trim() || d.content,
              updatedAt: new Date().toTimeString().slice(0, 5),
            }
          : d
      )
    );
  };

  const handlePublishDraft = (draftId: string, content?: string) => {
    const nowTime = new Date().toTimeString().slice(0, 5);
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? {
              ...d,
              content: content !== undefined ? content.trim() || d.content : d.content,
              status: 'published',
              publishedAt: nowTime,
              updatedAt: nowTime,
            }
          : d
      )
    );
  };

  const handleRegenerateDraft = (draftId: string) => {
    const existing = drafts.find((d) => d.id === draftId);
    if (!existing) return;
    const student = students.find((s) => s.id === existing.studentId);
    const template = templates.find((t) => t.id === existing.templateId);
    if (!student || !template) return;

    const refreshed = synthesizeGrowthDraft({
      student,
      template,
      clips,
      dateStr: '2026-11-05',
      taskId: existing.generatedByTaskId,
    });

    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? refreshed : d))
    );
  };

  const handleAddTask = (task: AutomationTask) => {
    setAutomationTasks((prev) => [task, ...prev]);
  };

  const handleToggleTask = (taskId: string) => {
    setAutomationTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setAutomationTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleRunTaskNow = (task: AutomationTask): number => {
    const nowTime = new Date().toTimeString().slice(0, 5);
    const result = runAutomationTaskGeneration({
      task,
      students,
      templates,
      clips,
      existingDrafts: drafts,
      dateStr: '2026-11-05',
      nowTimeStr: nowTime,
    });
    setDrafts(result.drafts);
    setAutomationTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              lastRunAt: `11-05 ${nowTime}`,
              executionLogs: [result.executionLog, ...(t.executionLogs || [])],
            }
          : t
      )
    );
    return result.generatedCount;
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] flex flex-col bg-[#FFFFFF] text-[#111827] overflow-hidden">
      {/* Single Discrete Top-Right Button for Records List */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-end z-20 shrink-0">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="查看记录列表"
          className="tactile-subtle-btn min-h-[44px] px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap text-[#111827] active:scale-95"
        >
          <List className="w-3.5 h-3.5 text-[#111827]" />
          <span>记录</span>
          <span className="font-mono text-[#64748B] tabular-nums">
            {todayClipsCount}
          </span>
        </button>
      </header>

      {/* Pure Sculptural Stage */}
      <main className="flex-1 min-h-0 flex flex-col">
        <TactileRecorderDeck
          activeSegment={activeSegment}
          onFinishRecording={handleFinishRecording}
        />
      </main>

      {/* Responsive Mobile Bottom Sheet / Desktop Slide-Over Sheet */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="片段记录列表"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsDrawerOpen(false);
            }}
            className="fixed inset-0 z-50 sm:bg-slate-900/30 sm:backdrop-blur-xs flex items-stretch justify-center sm:justify-end"
          >
            <motion.div
              initial={{ y: 24, opacity: 0.92 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#FFFFFF] text-[#111827] w-full h-[100dvh] max-h-[100dvh] sm:max-w-md sm:h-full sm:max-h-full rounded-none overflow-y-auto overscroll-contain px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7 space-y-2.5 sm:space-y-4 sm:shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight text-[#111827]">
                  片段记录
                </h2>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="关闭记录列表"
                  className="w-8 h-8 -mr-1 rounded-full bg-[#F1F3F7] hover:bg-[#E7EBF2] flex items-center justify-center text-[#111827] cursor-pointer transition-colors active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <SegmentManagerPanel
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                clipsForDate={clipsForSelectedDate}
                allClips={clips}
                students={students}
                templates={templates}
                drafts={drafts}
                automationTasks={automationTasks}
                onAssignClipStudent={handleAssignClipStudent}
                onUpdateDraftContent={handleUpdateDraftContent}
                onPublishDraft={handlePublishDraft}
                onRegenerateDraft={handleRegenerateDraft}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onRunTaskNow={handleRunTaskNow}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
