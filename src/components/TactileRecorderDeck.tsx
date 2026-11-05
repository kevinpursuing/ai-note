import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  formatDuration,
  type DailySegment,
} from '../utils/segmentLogic';
import { SIMULATED_SPEECH_SCRIPTS } from '../utils/seedData';

interface TactileRecorderDeckProps {
  activeSegment: DailySegment;
  onFinishRecording: (params: {
    transcript: string;
    durationSec: number;
    audioSource: 'mic' | 'simulated';
  }) => void;
}

export const TactileRecorderDeck: React.FC<TactileRecorderDeckProps> = ({
  activeSegment,
  onFinishRecording,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLockedMode, setIsLockedMode] = useState(false);
  const [selectedScriptIdx, setSelectedScriptIdx] = useState(0);
  // Live streaming text that flows left-to-right and wraps downward
  const [liveText, setLiveText] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [waveBars, setWaveBars] = useState<number[]>(
    Array.from({ length: 24 }, (_, i) => 15 + ((i * 7) % 20))
  );
  const [audioSourceType, setAudioSourceType] = useState<'mic' | 'simulated'>(
    'simulated'
  );
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const isRecordingRef = useRef(false);
  const fullTranscriptRef = useRef('');
  const recordingSecRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const streamTimerRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const vuTimerRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number>(0);
  const subtitleBoxRef = useRef<HTMLDivElement | null>(null);

  const playTactileSound = useCallback((isDown: boolean) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isDown ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isDown ? 240 : 165, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        isDown ? 58 : 42,
        ctx.currentTime + 0.032
      );
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.032);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.032);
      setTimeout(() => ctx.close().catch(() => {}), 60);
    } catch {
      // ignore
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    if (durationTimerRef.current) {
      window.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (vuTimerRef.current) {
      window.clearInterval(vuTimerRef.current);
      vuTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  // Smoothly keep scroll at bottom if text wraps past many lines
  useEffect(() => {
    if (subtitleBoxRef.current) {
      subtitleBoxRef.current.scrollTo({
        top: subtitleBoxRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [liveText]);

  const startRecordingSession = useCallback(
    (lockMode: boolean) => {
      if (isRecordingRef.current) return;
      playTactileSound(true);

      const activeScript =
        SIMULATED_SPEECH_SCRIPTS[
          selectedScriptIdx % SIMULATED_SPEECH_SCRIPTS.length
        ];

      isRecordingRef.current = true;
      setIsRecording(true);
      setIsLockedMode(lockMode);
      setSavedToast(null);
      fullTranscriptRef.current = '';
      setLiveText('');
      setRecordingSeconds(0);
      recordingSecRef.current = 0;
      startTimestampRef.current = Date.now();

      const SpeechRec =
        (
          window as unknown as {
            SpeechRecognition?: any;
            webkitSpeechRecognition?: any;
          }
        ).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: any })
          .webkitSpeechRecognition;

      let speechCapturedRealText = false;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.lang = 'zh-CN';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (event: any) => {
            let combined = '';
            for (let i = 0; i < event.results.length; i++) {
              combined += event.results[i][0].transcript;
            }
            if (combined.trim().length > 0) {
              speechCapturedRealText = true;
              setAudioSourceType('mic');
              fullTranscriptRef.current = combined;
              setLiveText(combined);
            }
          };
          rec.start();
          recognitionRef.current = rec;
        } catch {
          // fallback
        }
      }

      // Stream character-by-character from left to right, wrapping downward smoothly
      let charIndex = 0;
      streamTimerRef.current = window.setInterval(() => {
        if (!isRecordingRef.current || speechCapturedRealText) return;
        setAudioSourceType('simulated');

        const targetText = activeScript.text;
        if (charIndex < targetText.length) {
          charIndex += 1;
          const nextSlice = targetText.slice(0, charIndex);
          fullTranscriptRef.current = nextSlice;
          setLiveText(nextSlice);
        }
      }, 48);

      durationTimerRef.current = window.setInterval(() => {
        if (!isRecordingRef.current) return;
        const elapsed = Math.max(
          1,
          Math.round((Date.now() - startTimestampRef.current) / 1000)
        );
        recordingSecRef.current = elapsed;
        setRecordingSeconds(elapsed);
      }, 200);

      vuTimerRef.current = window.setInterval(() => {
        if (!isRecordingRef.current) return;
        setWaveBars((prev) =>
          prev.map((_, idx) => {
            const centerFactor = 1 - Math.abs(idx - 11.5) / 14;
            return Math.min(
              100,
              Math.max(15, Math.floor(24 + Math.random() * 76 * centerFactor))
            );
          })
        );
      }, 75);
    },
    [playTactileSound, selectedScriptIdx]
  );

  const stopAndSaveRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    playTactileSound(false);
    isRecordingRef.current = false;
    clearAllTimers();
    setIsRecording(false);
    setIsLockedMode(false);
    setWaveBars(Array.from({ length: 24 }, (_, i) => 15 + ((i * 7) % 20)));

    const activeScript =
      SIMULATED_SPEECH_SCRIPTS[
        selectedScriptIdx % SIMULATED_SPEECH_SCRIPTS.length
      ];
    let finalTranscript = fullTranscriptRef.current.trim();
    if (finalTranscript.length < 10) {
      finalTranscript = activeScript.text;
    }
    const finalDuration = Math.max(
      3,
      recordingSecRef.current || Math.round(finalTranscript.length / 4.5)
    );

    onFinishRecording({
      transcript: finalTranscript,
      durationSec: finalDuration,
      audioSource: audioSourceType,
    });

    setSelectedScriptIdx((prev) => (prev + 1) % SIMULATED_SPEECH_SCRIPTS.length);
    setLiveText('');
    setSavedToast('已存入今日记录');
    setTimeout(() => setSavedToast(null), 2200);
  }, [
    activeSegment.title,
    audioSourceType,
    clearAllTimers,
    onFinishRecording,
    playTactileSound,
    selectedScriptIdx,
  ]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isRecording) {
      stopAndSaveRecording();
      return;
    }
    startRecordingSession(false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isRecording && !isLockedMode) {
      const pressMs = Date.now() - startTimestampRef.current;
      if (pressMs < 320) {
        setIsLockedMode(true);
        return;
      }
      stopAndSaveRecording();
    }
  };

  const characters = Array.from(liveText);

  return (
    <div className="relative w-full h-[calc(100vh-80px)] flex items-center justify-center select-none overflow-hidden">
      {/* =====================================================================
          OUT-OF-FLOW SILKY SUBTITLE STREAM (Left-to-Right, then Top-to-Bottom)
          Fixed position: never occupies document flow or shifts the button!
          ===================================================================== */}
      <div
        aria-live="polite"
        data-testid="live-subtitle-screen"
        className="pointer-events-none fixed inset-x-0 top-[14%] sm:top-[16%] z-20 flex justify-center px-7"
      >
        <div
          ref={subtitleBoxRef}
          className="w-full max-w-[340px] sm:max-w-[400px] max-h-56 overflow-hidden text-left"
        >
          <AnimatePresence mode="wait">
            {isRecording && (
              <motion.p
                key="live-flow-paragraph"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="text-xl sm:text-[22px] font-medium text-[#1D1D1F] leading-[1.65] tracking-tight break-words"
              >
                {characters.map((char, idx) => (
                  <span key={idx} className="subtitle-char-reveal">
                    {char}
                  </span>
                ))}
              </motion.p>
            )}

            {!isRecording && savedToast && (
              <motion.div
                key="saved-pill"
                initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="text-center text-xs font-medium tracking-widest text-[#FF3B30] pt-16"
              >
                {savedToast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* =====================================================================
          THE SINGLE FIXED-POSITION HERO BUTTON (Scheme 5: Soft Ceramic + Dot-Matrix Halo)
          Anchored at the exact same spot; never shifts when subtitles stream!
          ===================================================================== */}
      <div className="relative z-10 flex flex-col items-center justify-center translate-y-16 sm:translate-y-18">
        <div className="relative w-60 h-60 flex items-center justify-center">
          {/* 24-Dot Acoustic Halo */}
          {Array.from({ length: 24 }).map((_, idx) => {
            const angle = idx * 15;
            const barVal = waveBars[idx % waveBars.length];
            const activeDot = isRecording && barVal > 40;
            return (
              <span
                key={idx}
                className="absolute w-2 h-2 rounded-full transition-all duration-100 pointer-events-none"
                style={{
                  backgroundColor: activeDot ? '#FF3B30' : '#D8D5CE',
                  transform: `rotate(${angle}deg) translateY(${
                    isRecording ? -(102 + (barVal / 100) * 16) : -98
                  }px) scale(${activeDot ? 1.3 : 0.85})`,
                }}
              />
            );
          })}

          {/* Soft Ceramic Concave Well + Tactile Button */}
          <div className="w-44 h-44 rounded-full ceramic-soft-well p-4 flex items-center justify-center">
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label={isRecording ? '停止并保存录音' : '按住触发AI录音'}
              className={`w-full h-full rounded-full ceramic-tactile-button cursor-pointer flex items-center justify-center focus:outline-none ${
                isRecording ? 'ceramic-tactile-button-pressed' : ''
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full transition-all duration-200 pointer-events-none ${
                  isRecording
                    ? 'bg-[#FF3B30] scale-125 shadow-[0_0_22px_rgba(255,59,48,0.7)]'
                    : 'bg-[#FF3B30]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Minimalist Timer / Status Caption below Button */}
        <div className="h-6 mt-3 flex items-center justify-center">
          <span className="font-mono text-xs font-medium tracking-widest text-black/35 tabular-nums">
            {isRecording
              ? `${formatDuration(recordingSeconds)} · ${
                  isLockedMode ? '轻点归档' : '松开归档'
                }`
              : 'HOLD TO RECORD'}
          </span>
        </div>
      </div>
    </div>
  );
};
