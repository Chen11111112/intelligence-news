'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArticleImage } from '@/components/ArticleImage';
import Link from 'next/link';
import {
  Loader2,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  X,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { channelDiscuss, channelOralFeedback } from '@/app/actions/channel';
import { getAIErrorMessage } from '@/lib/ai/errors';
import { speechErrorLabel, t } from '@/lib/copy';
import { useAIArticleAccess } from '@/hooks/useAIArticleAccess';
import { useSpeechRecognition, speakText } from '@/hooks/useSpeechRecognition';
import type { ChannelChatMessage, ChannelOralResult } from '@/lib/channel';
import type { NewsArticle, ExamTarget } from '@/lib/data';
import { cn } from '@/lib/utils';

interface ArticleChatPanelProps {
  article: NewsArticle;
  examType: ExamTarget;
  examScore: string;
  onClose: () => void;
}

export function ArticleChatPanel({
  article,
  examType,
  examScore,
  onClose,
}: ArticleChatPanelProps) {
  const aiAccess = useAIArticleAccess(article.id);
  const { supported: micSupported, listening, error: micError, listen, stop } =
    useSpeechRecognition('en-US');

  const [messages, setMessages] = useState<ChannelChatMessage[]>([]);
  const [oralMeta, setOralMeta] = useState<ChannelOralResult | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, oralMeta, loading]);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const access = aiAccess.checkAccess();
      if (!access.allowed) {
        setError(access.reason ?? t('channel.aiLimit'));
        return;
      }

      setError(null);
      setOralMeta(null);
      const userMsg: ChannelChatMessage = { role: 'user', content: trimmed };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput('');
      setLoading(true);

      try {
        const reply = await channelDiscuss(article.id, nextMessages, examType, examScore);
        aiAccess.recordUsage();
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        if (autoSpeak) speakText(reply);
      } catch (err) {
        setError(getAIErrorMessage(err, t('channel.sendFailed')));
        setMessages(messages);
      } finally {
        setLoading(false);
      }
    },
    [article.id, messages, loading, examType, examScore, aiAccess, autoSpeak, t],
  );

  const sendOral = useCallback(
    async (transcript: string) => {
      const trimmed = transcript.trim();
      if (!trimmed || loading) return;

      const access = aiAccess.checkAccess();
      if (!access.allowed) {
        setError(access.reason ?? t('channel.aiLimit'));
        return;
      }

      setError(null);
      const userMsg: ChannelChatMessage = { role: 'user', content: `🎤 ${trimmed}` };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setLoading(true);

      try {
        const result = await channelOralFeedback(article.id, trimmed, messages, examType, examScore);
        aiAccess.recordUsage();
        setOralMeta(result);
        setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
        if (autoSpeak) speakText(result.reply);
      } catch (err) {
        setError(getAIErrorMessage(err, t('channel.oralFailed')));
      } finally {
        setLoading(false);
      }
    },
    [article.id, messages, loading, examType, examScore, aiAccess, autoSpeak, t],
  );

  const handleMic = () => {
    if (listening) {
      stop();
      return;
    }
    if (!micSupported) {
      setError(t('channel.micUnsupported'));
      return;
    }
    listen((transcript) => {
      void sendOral(transcript);
    });
  };

  const micErrorLabel = micError ? speechErrorLabel(micError, t) : null;

  const fallbackImage =
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=400';

  return (
    <div className="flex flex-col h-full min-h-[420px] ui-card overflow-hidden">
      <div className="flex items-start gap-3 p-4 border-b ui-divider bg-slate-50/80 dark:bg-gray-900/50">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-gray-700">
          <ArticleImage
            src={article.imageUrl || fallbackImage}
            alt={article.titleEn}
            fill
            className="object-cover"
            sizes="56px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            {t('channel.bookmarked')}
          </p>
          <h3 className="font-bold ui-heading text-sm leading-snug line-clamp-2">
            {article.titleEn}
          </h3>
          <p className="text-xs ui-muted mt-0.5 line-clamp-1">{article.descriptionEn}</p>
          <p className="text-[10px] ui-subtle mt-1">{aiAccess.usageLabel}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setAutoSpeak((v) => !v)}
            className="p-2 rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700"
            title={autoSpeak ? t('channel.muteTts') : t('channel.enableTts')}
          >
            {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700"
            aria-label={t('channel.closeChat')}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 px-4">
            <MessageCircle className="mx-auto text-blue-200 dark:text-blue-900 mb-3" size={40} />
            <p className="text-sm text-slate-600 dark:text-gray-300">{t('channel.chatHint')}</p>
            <p className="text-xs ui-subtle mt-2">{t('channel.oralHint')}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
              msg.role === 'user'
                ? 'ml-auto bg-blue-600 text-white'
                : 'mr-auto bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-gray-100',
            )}
          >
            {msg.content}
          </div>
        ))}

        {oralMeta && (oralMeta.corrections.length > 0 || oralMeta.correctedSentence) && (
          <div className="mr-auto max-w-[95%] rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-4 space-y-3 text-sm">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
              {t('channel.oralCorrections')}
            </p>
            {oralMeta.correctedSentence && (
              <p className="text-slate-700 dark:text-gray-200">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{t('channel.suggested')}：</span>{' '}
                {oralMeta.correctedSentence}
              </p>
            )}
            <ul className="space-y-2">
              {oralMeta.corrections.map((c, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-700 dark:text-gray-300 border-t border-amber-100 dark:border-amber-900 pt-2 first:border-0 first:pt-0"
                >
                  <span className="line-through text-red-500/80">{c.original}</span>
                  {' → '}
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{c.suggestion}</span>
                  <span className="ml-1 text-[10px] uppercase text-amber-700 dark:text-amber-400">({c.type})</span>
                  <p className="ui-muted mt-0.5">{c.explanation}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 dark:text-gray-500 text-sm">
            <Loader2 size={16} className="animate-spin" />
            {t('channel.thinking')}
          </div>
        )}
      </div>

      {(error || micErrorLabel) && (
        <p className="px-4 py-2 text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 border-t border-red-50 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30">
          <AlertCircle size={14} />
          {error ?? micErrorLabel}
        </p>
      )}

      <form
        className="p-3 border-t ui-divider bg-white dark:bg-gray-800 flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void sendText(input);
        }}
      >
        <button
          type="button"
          onClick={handleMic}
          disabled={loading}
          className={cn(
            'shrink-0 p-3 rounded-xl transition-all',
            listening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400',
            !micSupported && 'opacity-50',
          )}
          title={listening ? t('channel.stopMic') : t('channel.startMic')}
        >
          {listening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={1}
          placeholder={t('channel.inputPlaceholder')}
          className="flex-1 resize-none ui-input px-3 py-2.5 text-sm max-h-28"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendText(input);
            }
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 p-3 rounded-xl bg-slate-900 dark:bg-blue-600 text-white disabled:opacity-40 hover:bg-slate-800 dark:hover:bg-blue-700"
        >
          <Send size={18} />
        </button>
      </form>

      <div className="px-4 pb-3 flex justify-between items-center text-[10px] ui-subtle">
        <Link href={`/article/${article.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
          {t('channel.readFull')} →
        </Link>
        <span>{t('channel.examLevel', { exam: examType, score: examScore })}</span>
      </div>
    </div>
  );
}
