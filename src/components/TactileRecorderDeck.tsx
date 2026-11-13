import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Upload, Mic, X, Square } from 'lucide-react';
import {
  formatDuration,
  formatFileSize,
  type ClipMediaType,
  type DailySegment,
} from '../utils/segmentLogic';
import { SIMULATED_SPEECH_SCRIPTS } from '../utils/seedData';

interface TactileRecorderDeckProps {
  activeSegment: DailySegment;
  onFinishRecording: (params: {
    transcript: string;
    durationSec: number;
    audioSource: 'mic' | 'simulated' | 'camera' | 'upload';
    mediaType?: ClipMediaType;
    mediaUrl?: string;
    fileName?: string;
    fileSizeLabel?: string;
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
  const [audioSourceType, setAudioSourceType] = useState<'mic' | 'simulated'>(
    'simulated'
  );
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Video Viewfinder Modal state
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const [hasRealCamera, setHasRealCamera] = useState(false);
  const [videoLiveText, setVideoLiveText] = useState('');

  // Drag & Drop state for Upload entrance
  const [isDragOver, setIsDragOver] = useState(false);

  const isRecordingRef = useRef(false);
  const fullTranscriptRef = useRef('');
  const recordingSecRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const streamTimerRef = useRef<number | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const startTimestampRef = useRef<number>(0);
  const subtitleBoxRef = useRef<HTMLDivElement | null>(null);

  // Video refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<number | null>(null);
  const videoStreamTextTimerRef = useRef<number | null>(null);
  const videoStartTsRef = useRef<number>(0);
  const videoTranscriptRef = useRef('');
  const isVideoRecordingRef = useRef(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setSavedToast(msg);
    window.setTimeout(() => {
      setSavedToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  }, []);

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
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  const stopCameraResources = useCallback(() => {
    if (videoTimerRef.current) {
      window.clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (videoStreamTextTimerRef.current) {
      window.clearInterval(videoStreamTextTimerRef.current);
      videoStreamTextTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setHasRealCamera(false);
    isVideoRecordingRef.current = false;
    setIsVideoRecording(false);
    setVideoSeconds(0);
    setVideoLiveText('');
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

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore unsupported environments
    }
  }, []);

  const startRecordingSession = useCallback(
    (lockMode: boolean) => {
      if (isRecordingRef.current) return;
      playTactileSound(true);
      triggerHaptic(14);

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
    },
    [playTactileSound, selectedScriptIdx]
  );

  const stopAndSaveRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    playTactileSound(false);
    triggerHaptic([10, 26, 14]);
    isRecordingRef.current = false;
    clearAllTimers();
    setIsRecording(false);
    setIsLockedMode(false);

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
      mediaType: 'audio',
    });

    setSelectedScriptIdx((prev) => (prev + 1) % SIMULATED_SPEECH_SCRIPTS.length);
    setLiveText('');
    showToast('已存入今日记录');
  }, [
    audioSourceType,
    clearAllTimers,
    onFinishRecording,
    playTactileSound,
    selectedScriptIdx,
    showToast,
    triggerHaptic,
  ]);

  // Video Viewfinder open / close & capture logic
  const handleOpenVideoViewfinder = useCallback(async () => {
    if (isRecordingRef.current) return;
    playTactileSound(true);
    setIsVideoOpen(true);
    setVideoSeconds(0);
    setVideoLiveText('');
    videoTranscriptRef.current = '';

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        });
        cameraStreamRef.current = stream;
        setHasRealCamera(true);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch {
        setHasRealCamera(false);
      }
    } else {
      setHasRealCamera(false);
    }
  }, [playTactileSound]);

  const handleCloseVideoViewfinder = useCallback(() => {
    playTactileSound(false);
    stopCameraResources();
    setIsVideoOpen(false);
  }, [playTactileSound, stopCameraResources]);

  const handleStartVideoCapture = useCallback(() => {
    if (isVideoRecordingRef.current) return;
    playTactileSound(true);
    isVideoRecordingRef.current = true;
    setIsVideoRecording(true);
    setVideoSeconds(0);
    videoStartTsRef.current = Date.now();
    videoChunksRef.current = [];
    videoTranscriptRef.current = '';
    setVideoLiveText('');

    if (cameraStreamRef.current && typeof MediaRecorder !== 'undefined') {
      try {
        const rec = new MediaRecorder(cameraStreamRef.current);
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            videoChunksRef.current.push(e.data);
          }
        };
        rec.start();
        mediaRecorderRef.current = rec;
      } catch {
        // fallback without MediaRecorder
      }
    }

    const activeScript =
      SIMULATED_SPEECH_SCRIPTS[
        (selectedScriptIdx + 1) % SIMULATED_SPEECH_SCRIPTS.length
      ];
    let charIdx = 0;
    videoStreamTextTimerRef.current = window.setInterval(() => {
      if (!isVideoRecordingRef.current) return;
      if (charIdx < activeScript.text.length) {
        charIdx += 1;
        const slice = activeScript.text.slice(0, charIdx);
        videoTranscriptRef.current = slice;
        setVideoLiveText(slice);
      }
    }, 52);

    videoTimerRef.current = window.setInterval(() => {
      if (!isVideoRecordingRef.current) return;
      setVideoSeconds(
        Math.max(1, Math.round((Date.now() - videoStartTsRef.current) / 1000))
      );
    }, 250);
  }, [playTactileSound, selectedScriptIdx]);

  const handleStopAndSaveVideo = useCallback(() => {
    if (!isVideoRecordingRef.current) return;
    playTactileSound(false);
    isVideoRecordingRef.current = false;

    const elapsed = Math.max(
      2,
      Math.round((Date.now() - videoStartTsRef.current) / 1000)
    );
    const activeScript =
      SIMULATED_SPEECH_SCRIPTS[
        (selectedScriptIdx + 1) % SIMULATED_SPEECH_SCRIPTS.length
      ];
    const finalText =
      videoTranscriptRef.current.trim().length >= 8
        ? videoTranscriptRef.current.trim()
        : activeScript.text;

    const finalizeVideoClip = (blobUrl?: string) => {
      const now = new Date();
      const stamp = `${String(now.getHours()).padStart(2, '0')}${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      onFinishRecording({
        transcript: finalText,
        durationSec: elapsed,
        audioSource: hasRealCamera ? 'camera' : 'simulated',
        mediaType: 'video',
        mediaUrl: blobUrl,
        fileName: `随手录像_${stamp}.webm`,
      });
      setSelectedScriptIdx((prev) => (prev + 1) % SIMULATED_SPEECH_SCRIPTS.length);
      stopCameraResources();
      setIsVideoOpen(false);
      showToast('录像已存入今日记录');
    };

    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const url = blob.size > 0 ? URL.createObjectURL(blob) : undefined;
        finalizeVideoClip(url);
      };
      rec.stop();
    } else {
      finalizeVideoClip(undefined);
    }
  }, [
    hasRealCamera,
    onFinishRecording,
    playTactileSound,
    selectedScriptIdx,
    showToast,
    stopCameraResources,
  ]);

  // File Upload processing
  const processUploadedFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      playTactileSound(true);

      for (const file of files) {
        const isAudio = file.type.startsWith('audio/');
        const isVideo = file.type.startsWith('video/');
        const isText =
          file.type.startsWith('text/') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md');

        const sizeLabel = formatFileSize(file.size);
        let objectUrl: string | undefined;
        let durationSec = 0;
        let transcript = `已导入文件「${file.name}」（${sizeLabel}）`;

        if (isAudio || isVideo) {
          objectUrl = URL.createObjectURL(file);
          durationSec = await new Promise<number>((resolve) => {
            const el = document.createElement(isVideo ? 'video' : 'audio');
            el.preload = 'metadata';
            el.onloadedmetadata = () => {
              const dur = Number.isFinite(el.duration)
                ? Math.max(1, Math.round(el.duration))
                : 15;
              resolve(dur);
            };
            el.onerror = () => resolve(15);
            el.src = objectUrl!;
          });
          transcript = `${isVideo ? '视频' : '音频'}文件「${file.name}」已归档，支持在记录列表中直接回放。`;
        } else if (isText) {
          try {
            const raw = await file.text();
            const trimmed = raw.trim().replace(/\s+/g, ' ');
            if (trimmed.length > 0) {
              transcript =
                trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
            }
          } catch {
            // keep default transcript
          }
        }

        onFinishRecording({
          transcript,
          durationSec,
          audioSource: 'upload',
          mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'file',
          mediaUrl: objectUrl,
          fileName: file.name,
          fileSizeLabel: sizeLabel,
        });
      }

      showToast(
        files.length > 1
          ? `已上传 ${files.length} 个文件至今日记录`
          : `已上传「${files[0].name}」`
      );
    },
    [onFinishRecording, playTactileSound, showToast]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
      stopCameraResources();
    };
  }, [clearAllTimers, stopCameraResources]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore synthetic click tests without pointerId
    }
    if (isRecording) {
      stopAndSaveRecording();
      return;
    }
    startRecordingSession(false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
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
  const videoCharacters = Array.from(videoLiveText);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className="relative w-full h-full flex-1 flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*,.txt,.md,.pdf,.doc,.docx"
        aria-label="选择上传文件"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Subtle Drag-and-Drop Overlay Ring */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-6 z-40 rounded-[36px] border-2 border-dashed border-[#FF3B30]/45 bg-[#FAF9F6]/65 backdrop-blur-xs flex items-center justify-center"
          >
            <span className="text-sm font-medium tracking-wide text-[#1D1D1F]">
              松开即可上传至「{activeSegment.title}」
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          OUT-OF-FLOW SILKY SUBTITLE STREAM (Left-to-Right, then Top-to-Bottom)
          Fixed position: never occupies document flow or shifts the buttons!
          ===================================================================== */}
      <div
        aria-live="polite"
        data-testid="live-subtitle-screen"
        className="pointer-events-none fixed inset-x-0 top-[max(4.5rem,9.5dvh)] sm:top-[12%] z-20 flex justify-center px-6 sm:px-7"
      >
        <div
          ref={subtitleBoxRef}
          className="w-full max-w-[340px] sm:max-w-[440px] max-h-[25dvh] sm:max-h-48 overflow-hidden text-left"
        >
          <AnimatePresence mode="wait">
            {isRecording && (
              <motion.div
                key="live-flow-paragraph"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-2"
              >
                <div className="font-mono text-[11px] tracking-widest text-[#86868B] tabular-nums">
                  {formatDuration(recordingSeconds)}
                </div>
                <p className="text-xl sm:text-[22px] font-medium text-[#1D1D1F] leading-[1.65] tracking-tight break-words">
                  {characters.map((char, idx) => (
                    <span key={idx} className="subtitle-char-reveal">
                      {char}
                    </span>
                  ))}
                </p>
              </motion.div>
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
          THREE-ENTRANCE CERAMIC CONSOLE TRIAD (Pure Sculpture, Zero Bottom Text)
          [ 录像 ]        ( 录音 )        [ 上传 ]
          ===================================================================== */}
      <div className="relative z-10 flex items-center justify-center gap-6 sm:gap-12 -translate-y-7 px-4">
        {/* LEFT SATELLITE: 录像 (Video Recording) */}
        <div
          className={`flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? 'opacity-35 scale-95 pointer-events-none'
              : 'opacity-100'
          }`}
        >
          <div className="w-[74px] h-[74px] sm:w-[88px] sm:h-[88px] rounded-full ceramic-satellite-well p-2 sm:p-2.5 flex items-center justify-center">
            <button
              type="button"
              onClick={handleOpenVideoViewfinder}
              aria-label="打开录像取景器"
              className="w-full h-full min-w-[44px] min-h-[44px] rounded-full ceramic-satellite-button cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D1D1F]"
            >
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full ceramic-lens-ring flex items-center justify-center pointer-events-none">
                <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90" />
              </span>
            </button>
          </div>
        </div>

        {/* CENTER HERO: 录音 (Pure Soft Ceramic Concave Well + Tactile Button) */}
        <div className="relative flex items-center justify-center">
          {/* Subtle acoustic pulse aura strictly while actively recording */}
          {isRecording && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-3 rounded-full border border-[#FF3B30]/25 animate-ping opacity-40"
            />
          )}
          <div
            className={`w-[152px] h-[152px] sm:w-44 sm:h-44 rounded-full ceramic-soft-well p-3.5 sm:p-4 flex items-center justify-center transition-shadow duration-300 ${
              isRecording ? 'ring-2 ring-[#FF3B30]/25' : ''
            }`}
          >
            <button
              type="button"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={isRecording ? '停止并保存录音' : '按住触发AI录音'}
              className={`touch-hold-surface w-full h-full rounded-full ceramic-tactile-button cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D1D1F] ${
                isRecording ? 'ceramic-tactile-button-pressed' : ''
              }`}
            >
              <Mic
                strokeWidth={1.75}
                className={`w-6 h-6 sm:w-7 sm:h-7 transition-all duration-200 pointer-events-none ${
                  isRecording
                    ? 'text-[#FF3B30] scale-95'
                    : 'text-[#1D1D1F]/75'
                }`}
              />
            </button>
          </div>
        </div>

        {/* RIGHT SATELLITE: 上传文件 (Upload File) */}
        <div
          className={`flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? 'opacity-35 scale-95 pointer-events-none'
              : 'opacity-100'
          }`}
        >
          <div className="w-[74px] h-[74px] sm:w-[88px] sm:h-[88px] rounded-full ceramic-satellite-well p-2 sm:p-2.5 flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                playTactileSound(true);
                fileInputRef.current?.click();
              }}
              aria-label="上传音视频或文稿文件"
              className="w-full h-full min-w-[44px] min-h-[44px] rounded-full ceramic-satellite-button cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D1D1F]"
            >
              <Upload
                strokeWidth={1.85}
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#1D1D1F]/80 pointer-events-none"
              />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          HARDWARE-INSPIRED CERAMIC VIDEO VIEWFINDER OVERLAY
          ===================================================================== */}
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="录像取景器"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isVideoRecording) {
                handleCloseVideoViewfinder();
              }
            }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="viewfinder-bezel w-full sm:max-w-md rounded-t-[32px] sm:rounded-[36px] px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:p-6 space-y-4 sm:space-y-5"
            >
              {/* Mobile Sheet Handle */}
              <div
                aria-hidden="true"
                className="w-10 h-1 rounded-full bg-black/15 mx-auto sm:hidden"
              />

              {/* Top Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-[#1D1D1F]">
                  <span>随手录像</span>
                  <span aria-hidden="true" className="text-[#86868B]">
                    ·
                  </span>
                  <span className="font-mono text-[#86868B] tabular-nums">
                    {isVideoRecording
                      ? formatDuration(videoSeconds)
                      : hasRealCamera
                      ? '取景就绪'
                      : '光学模拟取景'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCloseVideoViewfinder}
                  aria-label="关闭录像取景器"
                  className="w-11 h-11 -mr-1.5 rounded-full tactile-subtle-btn flex items-center justify-center text-[#1D1D1F] cursor-pointer active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Optical Viewfinder Screen (Portrait 3:4 on mobile, 4:3 on desktop) */}
              <div className="relative aspect-[3/4] sm:aspect-[4/3] max-h-[52dvh] sm:max-h-none w-full rounded-[24px] overflow-hidden bg-[#161618] shadow-inner flex flex-col justify-between p-4">
                {hasRealCamera ? (
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#2B2B30_0%,#141416_75%)] flex items-center justify-center">
                    {/* Precision Optical Framing Reticle */}
                    <div className="relative w-32 h-24 border border-white/15 rounded-xl flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full border border-white/35" />
                      <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-white/45 rounded-tl-sm" />
                      <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-white/45 rounded-tr-sm" />
                      <span className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-white/45 rounded-bl-sm" />
                      <span className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-white/45 rounded-br-sm" />
                    </div>
                  </div>
                )}

                {/* Scrim & Live Recording Subtitles inside Viewfinder */}
                <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-white/75">
                  <span>{isVideoRecording ? 'REC' : 'STBY'}</span>
                  <span className="tabular-nums">
                    {formatDuration(videoSeconds)}
                  </span>
                </div>

                {isVideoRecording && videoLiveText && (
                  <div className="relative z-10 bg-black/55 backdrop-blur-xs rounded-xl px-3 py-2 text-xs leading-relaxed text-white/95">
                    {videoCharacters.map((ch, i) => (
                      <span key={i} className="subtitle-char-reveal">
                        {ch}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ceramic Shutter Controls */}
              <div className="flex flex-col items-center gap-2 pt-1">
                <div className="w-20 h-20 rounded-full ceramic-satellite-well p-2.5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={
                      isVideoRecording
                        ? handleStopAndSaveVideo
                        : handleStartVideoCapture
                    }
                    aria-label={isVideoRecording ? '停止并保存录像' : '开始录像'}
                    className="w-full h-full rounded-full ceramic-satellite-button cursor-pointer flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30]"
                  >
                    {isVideoRecording ? (
                      <Square className="w-5 h-5 fill-[#FF3B30] text-[#FF3B30]" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-[#FF3B30] shadow-[0_0_12px_rgba(255,59,48,0.45)]" />
                    )}
                  </button>
                </div>
                <span className="font-mono text-[11px] tracking-widest text-black/45">
                  {isVideoRecording ? '轻点保存录像' : '轻点开始录像'}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
