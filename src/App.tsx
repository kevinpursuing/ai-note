import React, { useState, useEffect, useMemo } from 'react';
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
    audioSource: 'mic' | 'simulated';
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
    });

    setClips((prev) => [newClip, ...prev]);
    setSelectedDate(targetDate);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F3EF] text-[#1D1D1F] overflow-hidden">
      {/* Single Discrete Top-Right Button for Records List */}
      <header className="w-full max-w-4xl mx-auto px-5 pt-5 flex items-center justify-end z-20">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="查看记录列表"
          className="tactile-subtle-btn px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap text-[#1D1D1F]"
        >
          <List className="w-3.5 h-3.5 text-[#1D1D1F]" />
          <span>记录</span>
          <span className="font-mono text-[#86868B] tabular-nums">
            {todayClipsCount}
          </span>
        </button>
      </header>

      {/* Pure Single-Button Stage */}
      <main className="flex-1 flex flex-col justify-center">
        <TactileRecorderDeck
          activeSegment={activeSegment}
          onFinishRecording={handleFinishRecording}
        />
      </main>

      {/* Ultra-Minimal Slide-Over Sheet: Only Date Filter & Segment List */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="片段记录列表"
          className="fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex justify-end"
        >
          <div className="bg-[#F4F3EF] text-[#1D1D1F] w-full max-w-md h-full overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight text-[#1D1D1F]">
                片段记录
              </h2>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="关闭记录列表"
                className="w-8 h-8 rounded-full tactile-subtle-btn flex items-center justify-center text-[#1D1D1F] cursor-pointer"
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
          </div>
        </div>
      )}
    </div>
  );
}
