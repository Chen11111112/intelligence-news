/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { useEffect, useState } from 'react';
import { ArticleImage } from '@/components/ArticleImage';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  GraduationCap,
  X,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Loader2,
  RefreshCw,
  ExternalLink,
  Target,
  ListChecks,
} from 'lucide-react';
import { BookmarkButton } from '@/components/BookmarkButton';
import { AISummaryExportMenu } from '@/components/AISummaryExportMenu';
import { AILoginPrompt } from '@/components/AILoginPrompt';
import { AIErrorMessage } from '@/components/AIErrorMessage';
import { t } from '@/lib/copy';
import { useAISummaryCache } from '@/hooks/useAISummaryCache';
import { useAIQuizCache } from '@/hooks/useAIQuizCache';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAIArticleAccess } from '@/hooks/useAIArticleAccess';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { generateSummary, generateQuiz } from '@/app/actions/ai';
import { getAIErrorMessage } from '@/lib/ai/errors';
import { fetchArticleBody } from '@/app/actions/article';
import {
  getSourceLabel,
  getArticleText,
  splitParagraphs,
  formatPublishedAt,
} from '@/lib/article';
import type { AISummary, ExamTarget, NewsArticle, QuizQuestion } from '@/lib/data';
import { normalizeAISummary, normalizeQuizQuestion } from '@/lib/data';
import { getDailyAILimit } from '@/lib/user';

const EXAM_TARGETS: ExamTarget[] = ['IELTS', 'TOEFL', 'TOEIC'];

export default function ArticleDetailView({ article }: { article: NewsArticle }) {
  const router = useRouter();
  const id = article.id;

  const [bodyText, setBodyText] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [publishedAt, setPublishedAt] = useState<string | undefined>();
  const [loadingBody, setLoadingBody] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [examTarget, setExamTarget] = useState<ExamTarget>('IELTS');
  const { data: session } = useSession();
  const { settings, ready: userReady } = useUserSettings();
  const aiAccess = useAIArticleAccess(id);
  const summaryCache = useAISummaryCache(id, Boolean(session?.user?.id));
  const quizCache = useAIQuizCache(id, Boolean(session?.user?.id));

  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [summaryFromCache, setSummaryFromCache] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (userReady && settings?.examType) {
      setExamTarget(settings.examType);
    }
  }, [userReady, settings?.examType]);

  useEffect(() => {
    if (!summaryCache.loaded || !article) return;
    const cached = summaryCache.getCached();
    if (cached) {
      
      setAiSummary(normalizeAISummary(cached.summary));
      setExamTarget(cached.examTarget);
      setSummaryFromCache(true);
    }
  }, [summaryCache.loaded, summaryCache.getCached, article]);

  useEffect(() => {
    if (!article) return;

    const initSource = getSourceLabel(article);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSourceLabel(article.sourceName ?? initSource);
    setPublishedAt(article.publishedAt);

    const hasFullBody = Boolean(article.fullContentEn && article.fullContentEn.length > 300);
    if (hasFullBody) {
      setBodyText(article.fullContentEn!);
      setLoadingBody(false);
      return;
    }

    if (!article.sourceUrl) {
      setBodyText(article.descriptionEn);
      setLoadingBody(false);
      return;
    }

    let cancelled = false;
    setLoadingBody(true);

    fetchArticleBody(article.sourceUrl)
      .then((data) => {
        if (cancelled) return;
        setBodyText(data.fullContentEn || article.fullContentEn || article.descriptionEn);
        if (data.sourceName) setSourceLabel(data.sourceName);
        if (data.publishedAt) setPublishedAt(data.publishedAt);
      })
      .catch(() => {
        if (!cancelled) {
          setBodyText(article.fullContentEn || article.descriptionEn);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBody(false);
      });

    return () => {
      cancelled = true;
    };
  }, [article]);

  if (!article) {
    return <div className="pt-24 text-center ui-muted">{t('article.notFound')}</div>;
  }
  const defaultImage = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=1000";
  const articleText = getArticleText(article, bodyText);
  const publishedLabel = formatPublishedAt(publishedAt);
  const paragraphs = splitParagraphs(bodyText || article.descriptionEn);

  const handleFetchSummary = async () => {
    const access = aiAccess.checkAccess();
    if (!access.allowed) {
      setSummaryError(access.reason ?? t('ai.loginRequired'));
      return;
    }

    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const examScore = settings?.examScores[examTarget] ?? '7.5';
      const data = await generateSummary(id, articleText, examTarget, examScore);
      aiAccess.recordUsage();
      setAiSummary(data);
      setSummaryFromCache(false);
      await summaryCache.saveSummary(
        data,
        examTarget,
        article.titleEn,
        article.descriptionEn,
      );
    } catch (err) {
      setSummaryError(getAIErrorMessage(err, '無法生成摘要，請稍後再試。'));
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <main className="pt-24 pb-32 max-w-5xl mx-auto px-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 ui-btn-ghost mb-8"
      >
        <ChevronLeft size={20} />
        <span className="font-semibold">{t('article.back')}</span>
      </button>

      <header className="mb-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 mb-4"
        >
          <span className="ui-badge-blue px-3 py-1 rounded-full text-xs font-bold uppercase">
            {article.topic}
          </span>
          <span className="ui-muted text-sm font-medium">{article.readTime}</span>
          <span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-bold',
              article.difficulty === 'Easy'
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                : article.difficulty === 'Medium'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
            )}
          >
            {article.difficulty}
          </span>
        </motion.div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight ui-heading flex-1">
            {article.titleEn}
          </h1>
          <BookmarkButton articleId={article.id} className="shrink-0 mt-1" />
        </div>
        <h2 className="text-xl md:text-2xl ui-muted font-semibold mb-2">{article.descriptionEn}</h2>
        <p className="text-xs ui-subtle mb-8">{aiAccess.usageLabel}</p>

        <div className="relative w-full h-64 md:h-[420px] rounded-3xl overflow-hidden shadow-lg">
          <ArticleImage
            src={article.imageUrl || defaultImage}
            alt={article.titleEn || '圖片遺失'}
            fill
            quality={90}
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
            priority
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <ArticleBody
            sourceLabel={sourceLabel}
            publishedLabel={publishedLabel}
            sourceUrl={article.sourceUrl}
            loading={loadingBody}
            paragraphs={paragraphs}
            descriptionZh={article.descriptionZh}
          />
        </div>

        <aside className="lg:col-span-4">
          <AISummaryPanel
            articleTitleEn={article.titleEn}
            articleTitleZh={article.descriptionEn}
            examTarget={examTarget}
            onExamTargetChange={setExamTarget}
            aiSummary={aiSummary}
            fromCache={summaryFromCache}
            localLabel="繁體中文"
            t={t}
            loading={loadingSummary}
            error={summaryError}
            isLoggedIn={aiAccess.isLoggedIn}
            loginNeedsLogin={aiAccess.checkAccess().needsLogin}
            onGenerate={handleFetchSummary}
            onRegenerate={() => {
              setSummaryFromCache(false);
              setAiSummary(null);
              handleFetchSummary();
            }}
          />
        </aside>
      </div>

      <QuizSection
        examTarget={examTarget}
        onExamTargetChange={setExamTarget}
        isLoggedIn={aiAccess.isLoggedIn}
        onStart={() => {
          const access = aiAccess.checkAccess();
          if (!access.allowed) {
            setSummaryError(access.reason ?? t('ai.loginRequired'));
            return;
          }
          setShowQuiz(true);
        }}
      />

      <AnimatePresence>
        {showQuiz && (
          <QuizModal
            article={article}
            articleText={articleText}
            articleBodyLoading={loadingBody}
            examTarget={examTarget}
            examScore={settings?.examScores[examTarget] ?? '7.5'}
            quizCache={quizCache}
            checkAIAccess={aiAccess.checkAccess}
            onAIUsed={aiAccess.recordUsage}
            onClose={() => setShowQuiz(false)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function InteractiveParagraph({ text }: { text: string }) {
  return (
    <p className="text-lg leading-[1.85] text-slate-800 dark:text-gray-200 select-text">
      {text.split(' ').map((word, i) => (
        <span key={i} className="hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors px-0.5 rounded cursor-help">
          {word}{' '}
        </span>
      ))}
    </p>
  );
}

function ArticleBody({
  sourceLabel,
  publishedLabel,
  sourceUrl,
  loading,
  paragraphs,
  descriptionZh,
}: {
  sourceLabel: string;
  publishedLabel: string | null;
  sourceUrl?: string;
  loading: boolean;
  paragraphs: string[];
  descriptionZh: string;
}) {
  return (
    <section className="space-y-6">
      <p className="text-xs ui-subtle tracking-wide">
        {t('article.source')}：{sourceLabel}
        {publishedLabel && ` · ${publishedLabel}`}
        {sourceUrl && (
          <>
            {' · '}
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
            >
              {t('article.original')}
              <ExternalLink size={10} />
            </a>
          </>
        )}
      </p>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-slate-100 dark:bg-gray-800 rounded animate-pulse" style={{ width: `${95 - i * 8}%` }} />
          ))}
          <p className="text-xs text-slate-400">{t('article.loadingBody')}</p>
        </div>
      ) : (
        <article className="space-y-6">
          {paragraphs.map((paragraph, index) => (
            <InteractiveParagraph key={index} text={paragraph} />
          ))}
        </article>
      )}

      <p className="text-base italic ui-muted border-l-2 border-slate-200 dark:border-gray-700 pl-4 py-1">{descriptionZh}</p>
    </section>
  );
}

function AISummaryPanel({
  articleTitleEn,
  articleTitleZh,
  examTarget,
  onExamTargetChange,
  aiSummary,
  fromCache,
  localLabel,
  t,
  loading,
  error,
  isLoggedIn,
  loginNeedsLogin,
  onGenerate,
  onRegenerate,
}: {
  articleTitleEn: string;
  articleTitleZh: string;
  examTarget: ExamTarget;
  onExamTargetChange: (t: ExamTarget) => void;
  aiSummary: AISummary | null;
  fromCache: boolean;
  localLabel: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  loginNeedsLogin?: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
}) {
  const aiLimit = getDailyAILimit();
  return (
    <div className="ui-card p-6 lg:sticky lg:top-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl">
          <Sparkles className="text-blue-600 dark:text-blue-400" size={20} />
        </div>
        <div>
          <h4 className="font-bold ui-heading">{t('article.aiSummary')}</h4>
          <p className="text-xs ui-muted mt-0.5">
            Get AI Summary · 每日 {aiLimit} 篇文章
          </p>
        </div>
      </motion.div>

      <label className="block text-xs font-semibold ui-muted mb-1.5 uppercase tracking-wide">{t('article.examTarget')}</label>
      <select
        value={examTarget}
        onChange={(e) => onExamTargetChange(e.target.value as ExamTarget)}
        disabled={loading}
        className="w-full mb-4 text-sm ui-input px-3 py-2.5"
      >
        {EXAM_TARGETS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {!aiSummary ? (
        <div className="space-y-3">
          {!isLoggedIn ? (
            <AILoginPrompt />
          ) : (
            <>
              <ul className="text-xs ui-muted space-y-1.5 mb-4">
                <li className="flex items-center gap-2">
                  <ListChecks size={14} className="text-blue-500 shrink-0" />
                  雙語段落摘要
                </li>
                <li className="flex items-center gap-2">
                  <Target size={14} className="text-blue-500 shrink-0" />
                  符合 {examTarget} 程度的學術用語
                </li>
              </ul>
              <button
                onClick={onGenerate}
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t('article.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {t('article.getSummary')}
                  </>
                )}
              </button>
            </>
          )}
          {error && (
            <AIErrorMessage message={error} needsLogin={loginNeedsLogin} />
          )}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {fromCache && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-lg px-3 py-2">
              {t('article.cached')}
            </p>
          )}
          {(() => {
            const s = normalizeAISummary(aiSummary);
            return (
              <>
                <motion.div className="p-4 ui-card-muted">
                  <p className="text-[10px] font-bold ui-muted uppercase tracking-widest mb-2">Summary · EN</p>
                  <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{s.summary_en}</p>
                </motion.div>
                <motion.div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
                    Summary · {localLabel}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{s.summary_local}</p>
                </motion.div>
                {s.key_points_en && s.key_points_en.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold ui-muted uppercase tracking-widest">Key Points</p>
                    <ul className="space-y-2">
                      {s.key_points_en.map((point, i) => (
                        <li key={i} className="text-xs text-slate-600 dark:text-gray-300 flex gap-2">
                          <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0">{i + 1}.</span>
                          <span>
                            {point}
                            {s.key_points_local?.[i] && (
                              <span className="block ui-subtle mt-0.5">{s.key_points_local[i]}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            );
          })()}
          <AISummaryExportMenu
            articleTitleEn={articleTitleEn}
            articleTitleZh={articleTitleZh}
            examTarget={examTarget}
            summary={aiSummary}
          />
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="w-full py-2.5 ui-btn-secondary rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t('article.regenerate')}
          </button>
        </motion.div>
      )}
    </div>
  );
}

function QuizSection({
  examTarget,
  onExamTargetChange,
  onStart,
  isLoggedIn,
}: {
  examTarget: ExamTarget;
  onExamTargetChange: (t: ExamTarget) => void;
  onStart: () => void;
  isLoggedIn: boolean;
}) {
  const aiLimit = getDailyAILimit();
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-16 p-8 md:p-10 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl border border-blue-100 dark:border-gray-700 shadow-sm"
    >
      <motion.div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Vocabulary Quiz</p>
          <h3 className="text-2xl md:text-3xl font-bold ui-heading mb-2">Test Your Understanding</h3>
          <p className="text-slate-600 dark:text-gray-300 text-sm max-w-xl">
            根據本文內容生成 3 題字彙測驗，涵蓋同義字辨析與語境理解，協助 {examTarget} 考生鞏固閱讀詞彙。
            （摘要與測驗共用每日 {aiLimit} 篇額度）
          </p>
        </div>
        <div className="shrink-0">
          <label className="block text-xs font-semibold ui-muted mb-1.5">測驗目標</label>
          <select
            value={examTarget}
            onChange={(e) => onExamTargetChange(e.target.value as ExamTarget)}
            className="text-sm ui-input px-4 py-2.5 min-w-[140px]"
          >
            {EXAM_TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {['同義字辨識', '語境選詞', '學術字彙'].map((label) => (
          <div key={label} className="flex items-center gap-3 p-4 bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-slate-100 dark:border-gray-700">
            <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm shrink-0">✓</span>
            <span className="text-sm font-medium text-slate-700 dark:text-gray-200">{label}</span>
          </div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onStart}
        disabled={!isLoggedIn}
        className="w-full md:w-auto bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 mx-auto md:mx-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GraduationCap size={24} />
        {isLoggedIn ? 'Generate Vocabulary Quiz' : t('ai.loginRequired')}
      </motion.button>
      {!isLoggedIn && (
        <div className="mt-6 max-w-md">
          <AILoginPrompt />
        </div>
      )}
    </motion.section>
  );
}

function QuizModal({
  article,
  articleText,
  articleBodyLoading,
  examTarget,
  examScore,
  quizCache,
  checkAIAccess,
  onAIUsed,
  onClose,
}: {
  article: NewsArticle;
  articleText: string;
  articleBodyLoading: boolean;
  examTarget: ExamTarget;
  examScore: string;
  quizCache: ReturnType<typeof useAIQuizCache>;
  checkAIAccess: () => { allowed: boolean; reason?: string; needsLogin?: boolean };
  onAIUsed: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizFromCache, setQuizFromCache] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!quizCache.loaded) return;
    const cached = quizCache.getCached();
    if (
      cached &&
      cached.examTarget === examTarget &&
      cached.examScore === examScore &&
      cached.questions.length > 0
    ) {
      setQuestions(cached.questions.map((q) => normalizeQuizQuestion(q)));
      setQuizFromCache(true);
      setCurrentIdx(0);
      setSelected(null);
      setScore(0);
      setFinished(false);
    }
  }, [quizCache.loaded, quizCache.getCached, examTarget, examScore]);

  const startQuiz = async (forceRegenerate = false) => {
    if (!forceRegenerate && questions.length > 0 && quizFromCache) {
      setCurrentIdx(0);
      setSelected(null);
      setScore(0);
      setFinished(false);
      return;
    }

    const access = checkAIAccess();
    if (!access.allowed) {
      setError(access.reason ?? t('ai.loginRequired'));
      return;
    }

    if (articleBodyLoading) {
      setError('文章內容載入中，請稍候再試');
      return;
    }

    if (!articleText?.trim() || articleText.trim().length < 80) {
      setError('文章內容尚未載入完成，請稍候再試');
      return;
    }

    setLoading(true);
    setError(null);
    setFinished(false);
    setQuizFromCache(false);
    try {
      const data = await generateQuiz(article.id, articleText, examTarget, examScore);
      onAIUsed();
      setQuestions(data);
      setCurrentIdx(0);
      setSelected(null);
      setScore(0);
      await quizCache.saveQuiz(data, examTarget, examScore, article.titleEn);
    } catch (err) {
      setError(getAIErrorMessage(err, '無法生成測驗，請稍後再試。'));
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const isCorrect = selected === questions[currentIdx].correct_index;
    const newScore = isCorrect ? score + 1 : score;

    if (currentIdx < questions.length - 1) {
      setScore(newScore);
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    } else {
      setScore(newScore);
      setFinished(true);
    }
  };

  const progress = questions.length > 0 ? ((currentIdx + (selected !== null ? 1 : 0)) / questions.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="ui-modal w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <motion.div className="p-6 border-b ui-divider flex justify-between items-center bg-slate-50/50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold ui-heading">AI 字彙測驗</h2>
            <p className="text-xs ui-muted mt-0.5">{examTarget} · {article.titleEn.slice(0, 40)}…</p>
            {quizFromCache && questions.length > 0 && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">已載入先前儲存的測驗</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </motion.div>

        {questions.length > 0 && !finished && (
          <div className="h-1 bg-slate-100 dark:bg-gray-700">
            <motion.div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        <div className="p-6 md:p-8 overflow-y-auto ui-page flex-1 relative">
          {loading && questions.length > 0 && (
            <div className="absolute inset-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-blue-600" />
              <p className="text-sm ui-muted">正在生成新題目，約需 30–90 秒…</p>
            </div>
          )}
          {questions.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="mx-auto mb-4 text-blue-600" size={48} />
              <p className="text-slate-600 dark:text-gray-300 mb-6 text-sm max-w-sm mx-auto">
                將依據文章全文生成 3 題選擇題，測試你對關鍵字彙的掌握程度。
              </p>
              <button
                onClick={() => void startQuiz()}
                disabled={loading || articleBodyLoading}
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    正在生成題目（約 30–90 秒）…
                  </>
                ) : articleBodyLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    文章載入中…
                  </>
                ) : (
                  '開始測驗'
                )}
              </button>
              {error && <AIErrorMessage message={error} needsLogin={checkAIAccess().needsLogin} className="text-sm text-red-500 mt-4" />}
            </div>
          ) : finished ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <CheckCircle2 className="mx-auto mb-4 text-green-500" size={56} />
              <h3 className="text-2xl font-bold mb-2">測驗完成！</h3>
              <p className="text-4xl font-bold text-blue-600 mb-2">
                {score} / {questions.length}
              </p>
              <p className="ui-muted text-sm mb-8">
                {score === questions.length
                  ? '太棒了！全部答對。'
                  : score >= questions.length / 2
                    ? '表現不錯，可以再複習一次。'
                    : '建議重新閱讀文章後再挑戰。'}
              </p>
              <motion.div className="flex gap-3 justify-center">
                <button
                  onClick={() => void startQuiz(true)}
                  disabled={loading}
                  className="px-6 py-2.5 ui-btn-secondary rounded-xl font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      生成中…
                    </>
                  ) : (
                    '再來一組'
                  )}
                </button>
                <button onClick={onClose} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
                  關閉
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  第 {currentIdx + 1} / {questions.length} 題
                </span>
              </div>
              <p className="text-xl leading-relaxed font-medium">{questions[currentIdx].question}</p>
              <p className="text-sm ui-muted bg-slate-50 dark:bg-gray-900 px-3 py-2 rounded-lg italic">
                提示：{normalizeQuizQuestion(questions[currentIdx]).locale_hint}
              </p>

              <div className="grid gap-3">
                {questions[currentIdx].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => selected === null && setSelected(i)}
                    disabled={selected !== null}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center',
                      selected === i
                        ? i === questions[currentIdx].correct_index
                          ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-950 dark:border-green-600 dark:text-green-300'
                          : 'bg-red-50 border-red-400 text-red-800 dark:bg-red-950 dark:border-red-600 dark:text-red-300'
                        : selected !== null && i === questions[currentIdx].correct_index
                          ? 'bg-green-50/60 border-green-300 dark:bg-green-950/40 dark:border-green-700'
                          : 'border-slate-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/30',
                    )}
                  >
                    <span>{opt}</span>
                    {selected === i &&
                      (i === questions[currentIdx].correct_index ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <X size={18} />
                      ))}
                  </button>
                ))}
              </div>

              {selected !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 ui-card-muted"
                >
                  <p className="text-sm font-semibold text-slate-700 dark:text-gray-200 mb-1">解析</p>
                  <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">{questions[currentIdx].explanation}</p>
                  <button
                    onClick={handleNext}
                    className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    {currentIdx < questions.length - 1 ? '下一題' : '查看成績'}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
