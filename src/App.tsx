import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List, X } from 'lucide-react';
import {
  resolveTargetSegment,
  createRecordedClip,
  type DailySegment,
  type VoiceClip,
} from './utils/segmentLogic';
import {
  INITIAL_SEGMENTS,
  INITIAL_CLIPS,
} from './utils/seedData';
import { TactileRecorderDeck } from './components/TactileRecorderDeck';
import { SegmentManagerPanel } from './components/SegmentManagerPanel';

const STORAGE_KEYS = {
  SEGMENTS: 'teacher_voice_lab_segments_v5',
  CLIPS: 'teacher_voice_lab_clips_v5',
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

  const [selectedDate, setSelectedDate] = useState<string>('2026-11-05');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

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
    });

    setClips((prev) => [newClip, ...prev]);
    setSelectedDate(targetDate);
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] flex flex-col bg-[#F4F3EF] text-[#1D1D1F] overflow-hidden">
      {/* Single Discrete Top-Right Button for Records List */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-end z-20 shrink-0">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="查看记录列表"
          className="tactile-subtle-btn min-h-[44px] px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap text-[#1D1D1F] active:scale-95"
        >
          <List className="w-3.5 h-3.5 text-[#1D1D1F]" />
          <span>记录</span>
          <span className="font-mono text-[#86868B] tabular-nums">
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
            className="fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex items-end sm:items-stretch justify-center sm:justify-end"
          >
            <motion.div
              initial={{ y: 40, opacity: 0.9 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 48, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onTouchStart={(e) => {
                const target = e.currentTarget;
                if (target.scrollTop <= 0) {
                  touchStartYRef.current = e.touches[0].clientY;
                } else {
                  touchStartYRef.current = null;
                }
              }}
              onTouchEnd={(e) => {
                if (touchStartYRef.current !== null) {
                  const deltaY =
                    e.changedTouches[0].clientY - touchStartYRef.current;
                  if (deltaY > 90) {
                    setIsDrawerOpen(false);
                  }
                }
                touchStartYRef.current = null;
              }}
              className="bg-[#F4F3EF] text-[#1D1D1F] w-full sm:max-w-md max-h-[88dvh] sm:max-h-full sm:h-full rounded-t-[32px] sm:rounded-none overflow-y-auto overscroll-contain px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:p-8 space-y-5 shadow-2xl"
            >
              {/* Mobile Bottom-Sheet Grab Handle */}
              <div
                aria-hidden="true"
                className="w-10 h-1 rounded-full bg-black/15 mx-auto mb-1 sm:hidden"
              />

              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight text-[#1D1D1F]">
                  片段记录
                </h2>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="关闭记录列表"
                  className="w-11 h-11 -mr-1.5 rounded-full tactile-subtle-btn flex items-center justify-center text-[#1D1D1F] cursor-pointer active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <SegmentManagerPanel
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                clipsForDate={clipsForSelectedDate}
                allClips={clips}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
