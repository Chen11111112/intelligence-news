'use client';

import { useState } from 'react';
import {
  Share2,
  Copy,
  FileDown,
  FileText,
  Printer,
  Check,
  ChevronDown,
} from 'lucide-react';
import type { AISummary, ExamTarget } from '@/lib/data';
import {
  copySummaryToClipboard,
  downloadTextFile,
  formatSummaryAsPlainText,
  openSummaryPrintPdf,
  shareSummary,
  type SummaryExportContext,
} from '@/lib/ai-summary-export';
import { getAIErrorMessage } from '@/lib/ai/errors';
import { cn } from '@/lib/utils';

interface AISummaryExportMenuProps {
  articleTitleEn: string;
  articleTitleZh: string;
  examTarget: ExamTarget;
  summary: AISummary;
  className?: string;
}

function buildContext(props: AISummaryExportMenuProps): SummaryExportContext {
  return {
    articleTitleEn: props.articleTitleEn,
    articleTitleZh: props.articleTitleZh,
    examTarget: props.examTarget,
    summary: props.summary,
  };
}

function safeFilename(title: string): string {
  return title.replace(/[^\w\u4e00-\u9fff\s-]/g, '').trim().slice(0, 40) || 'ai-summary';
}

export function AISummaryExportMenu(props: AISummaryExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ctx = buildContext(props);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setError(null);
    setTimeout(() => setFeedback(null), 2500);
  };

  const run = async (action: () => Promise<void> | void, successMsg: string) => {
    setError(null);
    try {
      await action();
      showFeedback(successMsg);
      setOpen(false);
    } catch (err) {
      setError(getAIErrorMessage(err, '操作失敗，請稍後再試'));
    }
  };

  const actions = [
    {
      id: 'share',
      label: '分享',
      icon: Share2,
      onClick: async () => {
        setError(null);
        try {
          const result = await shareSummary(ctx);
          if (result === 'cancelled') return;
          showFeedback(
            result === 'copied'
              ? '已複製摘要，可貼到 Line 或 iOS 記事本'
              : '已開啟系統分享選單',
          );
          setOpen(false);
        } catch (err) {
          setError(getAIErrorMessage(err, '分享失敗，請稍後再試'));
        }
      },
    },
    {
      id: 'txt',
      label: '下載文字檔',
      icon: FileDown,
      onClick: () =>
        run(() => {
          const name = `${safeFilename(props.articleTitleEn)}-summary.txt`;
          downloadTextFile(name, formatSummaryAsPlainText(ctx));
        }, '已下載文字檔'),
    },
    {
      id: 'copy',
      label: '複製全文',
      icon: Copy,
      onClick: () =>
        run(async () => {
          await copySummaryToClipboard(ctx);
        }, '已複製到剪貼簿'),
    },
  ];

  return (
    <div className={cn('relative', props.className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full py-2.5 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center gap-2"
      >
        <FileText size={16} />
        匯出 / 分享摘要
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 ui-modal overflow-hidden">
          {actions.map(({ id, label, icon: Icon, onClick }) => (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 flex items-center gap-3 border-b ui-divider last:border-0"
            >
              <Icon size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 justify-center">
          <Check size={12} />
          {feedback}
        </p>
      )}
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
    </div>
  );
}
