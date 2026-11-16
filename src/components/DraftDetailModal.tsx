import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Copy,
  RefreshCw,
  Send,
  Pencil,
} from 'lucide-react';
import type { GrowthRecordDraft } from '../utils/segmentLogic';

interface DraftDetailModalProps {
  isOpen: boolean;
  title?: string;
  drafts: GrowthRecordDraft[];
  activeDraftId: string | null;
  onSelectDraft: (draftId: string) => void;
  onClose: () => void;
  onUpdateDraftContent: (draftId: string, content: string) => void;
  onPublishDraft: (draftId: string, content?: string) => void;
  onRegenerateDraft: (draftId: string) => void;
}

export const DraftDetailModal: React.FC<DraftDetailModalProps> = ({
  isOpen,
  title = '草稿详情',
  drafts,
  activeDraftId,
  onSelectDraft,
  onClose,
  onUpdateDraftContent,
  onPublishDraft,
  onRegenerateDraft,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  const activeIndex = drafts.findIndex((d) => d.id === activeDraftId);
  const activeDraft =
    (activeIndex >= 0 ? drafts[activeIndex] : drafts[0]) || null;

  useEffect(() => {
    setIsEditing(false);
    setEditingText(activeDraft?.content || '');
  }, [activeDraft?.id]);

  useEffect(() => {
    if (!isEditing && activeDraft) {
      setEditingText(activeDraft.content);
    }
  }, [activeDraft?.content, isEditing]);

  useEffect(() => {
    if (isOpen && activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [isOpen, activeDraft?.id]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setFeedbackMsg(null);
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    window.setTimeout(() => {
      setFeedbackMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleCopy = async () => {
    if (!activeDraft) return;
    const textToCopy = isEditing ? editingText : activeDraft.content;
    try {
      await navigator.clipboard?.writeText(textToCopy);
    } catch {
      // ignore clipboard errors
    }
    setCopiedId(activeDraft.id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === activeDraft.id ? null : prev));
    }, 1800);
  };

  const handlePublish = () => {
    if (!activeDraft) return;
    onPublishDraft(activeDraft.id, isEditing ? editingText : undefined);
    setIsEditing(false);
    showToast(`已发布「${activeDraft.studentName} · ${activeDraft.templateTitle}」`);
  };

  return (
    <AnimatePresence>
      {isOpen && activeDraft && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="草稿详情"
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
            className="bg-[#FFFFFF] text-[#111827] w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-w-lg sm:max-h-[88dvh] rounded-none sm:rounded-[28px] flex flex-col overflow-hidden px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7 sm:shadow-2xl"
          >
            {/* Compact Top Header Bar with Close Button */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-baseline gap-2 min-w-0">
                <h3 className="text-sm font-semibold tracking-tight text-[#111827]">
                  {title}
                </h3>
                <span className="font-mono text-[11px] text-[#94A3B8] tabular-nums">
                  {Math.max(1, activeIndex + 1)}/{drafts.length}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="关闭草稿详情"
                className="w-8 h-8 -mr-1 rounded-full bg-[#F1F3F7] hover:bg-[#E7EBF2] flex items-center justify-center text-[#111827] cursor-pointer transition-colors active:scale-95 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Top Draft Switcher Tabs */}
            <div
              role="tablist"
              aria-label="切换草稿"
              className="mt-2.5 apple-recessed-track p-0.5 rounded-full flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0"
            >
              {drafts.map((draft) => {
                const isActive = draft.id === activeDraft.id;
                const isPublished = draft.status === 'published';
                return (
                  <button
                    key={draft.id}
                    ref={isActive ? activeTabRef : undefined}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => onSelectDraft(draft.id)}
                    className={`h-7 px-3 rounded-full text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all active:scale-95 ${
                      isActive
                        ? 'apple-pill-active text-[#111827] font-semibold'
                        : 'text-[#64748B] hover:text-[#111827] font-medium'
                    }`}
                  >
                    <span>
                      {draft.studentName} · {draft.templateTitle}
                    </span>
                    {isPublished && (
                      <span
                        aria-label="已发布"
                        className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main Draft Content Card */}
            <div className="mt-3 flex-1 min-h-0 flex flex-col">
              <div className="apple-ceramic-card rounded-2xl p-4 sm:p-5 flex-1 min-h-0 flex flex-col space-y-3">
                {/* Metadata Header */}
                <div className="flex items-start justify-between gap-2 shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[14px]">
                      <span className="font-semibold text-[#111827] truncate">
                        {activeDraft.templateTitle}
                      </span>
                      <span aria-hidden="true" className="text-[#94A3B8]">
                        ·
                      </span>
                      <span className="font-medium text-[#111827] whitespace-nowrap">
                        {activeDraft.studentName}
                      </span>
                      {activeDraft.classLabel && (
                        <span className="text-xs text-[#64748B] whitespace-nowrap">
                          {activeDraft.classLabel}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-[#94A3B8] tabular-nums mt-0.5">
                      {activeDraft.dateStr.slice(5)} {activeDraft.updatedAt} ·{' '}
                      {activeDraft.sourceClipIds.length} 条实录
                    </div>
                  </div>

                  {activeDraft.status === 'published' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-medium whitespace-nowrap shrink-0">
                      已发布
                    </span>
                  )}
                </div>

                {/* Scrollable Body / Editor */}
                <div className="flex-1 min-h-0 overflow-y-auto pt-2.5 border-t border-[#EEF1F6]">
                  {isEditing ? (
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={9}
                      aria-label="编辑草稿正文"
                      className="w-full h-full min-h-[190px] rounded-xl bg-[#F3F5F9] border border-[#E5E9F0] p-3 text-[14px] leading-[1.7] text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#3B66F5]/25 focus:border-[#3B66F5]/40 resize-none"
                    />
                  ) : (
                    <p className="text-[14px] leading-[1.75] text-[#111827] whitespace-pre-wrap">
                      {activeDraft.content}
                    </p>
                  )}
                </div>

                {/* Card Secondary Actions */}
                <div className="pt-2 border-t border-[#EEF1F6] flex items-center justify-between gap-2 shrink-0">
                  {isEditing ? (
                    <div className="w-full flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingText(activeDraft.content);
                          setIsEditing(false);
                        }}
                        className="h-8 px-3 rounded-lg text-xs text-[#64748B] hover:bg-[#F1F3F7] cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateDraftContent(activeDraft.id, editingText);
                          setIsEditing(false);
                          showToast('已保存修改');
                        }}
                        className="h-8 px-3 rounded-lg bg-[#EFF4FF] hover:bg-[#E1EBFF] text-xs font-medium text-[#3B66F5] cursor-pointer"
                      >
                        保存修改
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onRegenerateDraft(activeDraft.id);
                          showToast('已基于最新实录刷新');
                        }}
                        className="h-8 px-2 -ml-1 rounded-lg flex items-center gap-1 text-xs text-[#64748B] hover:text-[#111827] hover:bg-[#F1F3F7] cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>刷新</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="h-8 px-2.5 rounded-lg flex items-center gap-1 text-xs text-[#64748B] hover:text-[#111827] hover:bg-[#F1F3F7] cursor-pointer transition-colors"
                        >
                          {copiedId === activeDraft.id ? (
                            <Check className="w-3.5 h-3.5 text-[#3B66F5]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {copiedId === activeDraft.id ? '已复制' : '复制'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingText(activeDraft.content);
                            setIsEditing(true);
                          }}
                          className="h-8 px-2.5 rounded-lg flex items-center gap-1 text-xs text-[#64748B] hover:text-[#111827] hover:bg-[#F1F3F7] cursor-pointer transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>编辑</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Feedback Notice */}
            {feedbackMsg && (
              <p className="mt-2 text-xs text-[#059669] font-medium text-center shrink-0">
                {feedbackMsg}
              </p>
            )}

            {/* Direct Publish Action */}
            <div className="mt-3 shrink-0">
              <button
                type="button"
                onClick={handlePublish}
                className={`w-full h-11 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.99] ${
                  activeDraft.status === 'published' && !isEditing
                    ? 'bg-[#F1F3F7] hover:bg-[#E7EBF2] text-[#111827]'
                    : 'bg-[#3B66F5] hover:bg-[#2F57E0] text-white shadow-xs'
                }`}
              >
                {activeDraft.status === 'published' && !isEditing ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>已发布 · 再次发布</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>直接发布</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
