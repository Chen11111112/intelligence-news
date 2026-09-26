/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Award,
  BookOpen,
  Sparkles,
  Save,
  Tag,
  X,
  Zap,
  ChevronRight,
} from 'lucide-react';
import {
  persistUserProfile,
  syncCrawlPreferences,
  loadAIUsageFromDb,
  loadAISummariesFromDb,
} from '@/app/actions/user';
import { t, tagLabel } from '@/lib/copy';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { ExamTarget } from '@/lib/data';
import { ALL_SELECTABLE_TAGS } from '@/lib/tags';
import { cn } from '@/lib/utils';
import { clampTagPreferences, getDailyAILimit, getMaxTags, tagSlugsToTopics, type ExamScores } from '@/lib/user';
import type { UserProfileClient } from '@/lib/user/profile-db';
import { mergeAISummariesFromCloud } from '@/lib/ai-summaries';
import type { Session } from 'next-auth';
import LogoutButton from '../LogoutButton';

type ExamType = ExamTarget;

interface ProfileFormProps {
  session: Session;
  initialProfile: UserProfileClient | null;
  profileLoadError?: string | null;
}

export default function ProfileForm({
  session,
  initialProfile,
  profileLoadError = null,
}: ProfileFormProps) {
  const router = useRouter();
  const { settings, update, ready } = useUserSettings();
  const [activeExam, setActiveExam] = useState<ExamType>('IELTS');
  const [scores, setScores] = useState<ExamScores>({
    TOEIC: '850',
    IELTS: '7.5',
    TOEFL: '100',
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [crawlSynced, setCrawlSynced] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [dbError, setDbError] = useState<string | null>(profileLoadError);
  const [profileHydrated, setProfileHydrated] = useState(false);

  const maxTags = getMaxTags();
  const aiLimit = getDailyAILimit();
  const aiUsed = settings?.aiUsage.articleIds.length ?? 0;
  const aiLeft = Math.max(0, aiLimit - aiUsed);

  useEffect(() => {
    if (profileHydrated) return;

    if (initialProfile) {
      update({
        examType: initialProfile.examType,
        examScores: initialProfile.examScores,
        tagPreferences: clampTagPreferences(initialProfile.tagPreferences ?? []),
        topicPreferences: initialProfile.topicPreferences,
        bookmarks: initialProfile.bookmarks,
        aiUsage: initialProfile.aiUsage,
      });
    } else if (profileLoadError) {
      setDbError(profileLoadError);
    }

    setProfileHydrated(true);

    void loadAISummariesFromDb().then((cloud) => {
      if (Object.keys(cloud).length > 0) mergeAISummariesFromCloud(cloud);
    });
    void loadAIUsageFromDb().then((usage) => {
      if (usage) update({ aiUsage: usage });
    });
  }, [initialProfile, profileLoadError, profileHydrated, update]);

  useEffect(() => {
    if (!settings) return;
    setActiveExam(settings.examType);
    setScores(settings.examScores);
    setSelectedTags(settings.tagPreferences);
  }, [settings]);

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(slug)) return prev.filter((item) => item !== slug);
      if (prev.length >= maxTags) return prev;
      return [...prev, slug];
    });
  };

  const handleSaveProfile = async () => {
    setSaveError(null);
    const tags = clampTagPreferences(selectedTags);
    if (tags.length === 0) {
      setSaveError(t('profile.needTag'));
      return;
    }

    const nextSettings = {
      examType: activeExam,
      examScores: scores,
      tagPreferences: tags,
      topicPreferences: tagSlugsToTopics(tags),
      bookmarks: settings?.bookmarks ?? [],
      aiUsage: settings?.aiUsage ?? { date: new Date().toISOString().slice(0, 10), articleIds: [] },
    };

    const dbResult = await persistUserProfile(nextSettings);
    if (!dbResult.ok) {
      setSaveError(dbResult.error);
      return;
    }

    update({
      examType: dbResult.profile.examType,
      examScores: dbResult.profile.examScores,
      tagPreferences: dbResult.profile.tagPreferences,
      topicPreferences: dbResult.profile.topicPreferences,
      bookmarks: dbResult.profile.bookmarks,
      aiUsage: dbResult.profile.aiUsage,
    });

    try {
      const crawl = await syncCrawlPreferences(dbResult.profile.tagPreferences);
      if (!crawl.ok) {
        setSaveError(t('profile.crawlSyncFailed'));
        return;
      }
      router.refresh();
      setCrawlSynced(true);
      setTimeout(() => setCrawlSynced(false), 3000);
    } catch {
      setSaveError(t('profile.crawlSyncFailed'));
    }

    setIsTagsModalOpen(false);
    setIsExamModalOpen(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const renderScoreOptions = () => {
    if (activeExam === 'IELTS') {
      return ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map((s) => (
        <option key={s} value={s}>{s}</option>
      ));
    }
    if (activeExam === 'TOEFL') {
      return ['60', '70', '80', '90', '100', '110', '120'].map((s) => (
        <option key={s} value={s}>{s}</option>
      ));
    }
    return ['550', '650', '750', '850', '950'].map((s) => (
      <option key={s} value={s}>{s}</option>
    ));
  };

  const renderTagButton = (slug: string, en: string) => {
    const selected = selectedTags.includes(slug);
    const disabled = !selected && selectedTags.length >= maxTags;
    return (
      <button
        key={slug}
        type="button"
        disabled={disabled}
        onClick={() => toggleTag(slug)}
        className={cn(
          'py-2 px-3 rounded-xl text-left border transition flex flex-col min-w-[120px]',
          selected ? 'ui-chip-selected' : 'ui-chip-default',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        <span className="text-[10px] uppercase font-bold opacity-70">{en}</span>
        <span className="text-xs font-semibold mt-0.5">{tagLabel(slug)}</span>
      </button>
    );
  };

  if (!ready || !profileHydrated) {
    return <div className="text-center ui-muted pt-12">{t('profile.loading')}</div>;
  }

  return (
    <div className="space-y-10">
      <section className="flex flex-col items-center text-center scroll-mt-[var(--app-header-offset)]">
        <div className="relative w-32 h-32 mb-6 shrink-0">
          <Image
            src={session.user?.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400'}
            className="rounded-full w-32 h-32 object-cover border-4 border-white dark:border-gray-700 shadow"
            alt="Avatar"
            width={128}
            height={128}
          />
          <div className="absolute bottom-1 right-1 bg-blue-600 text-white p-1 rounded-full">
            <CheckCircle2 size={16} fill="white" className="text-blue-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold ui-heading">{session.user?.name || 'User'}</h2>
        <p className="ui-muted font-medium mt-1 flex items-center gap-2">
          <Award size={18} className="text-amber-500" />
          {t('profile.member', { exam: activeExam, score: scores[activeExam] })}
        </p>
        {dbError && <p className="text-xs text-red-500 mt-2">{dbError}</p>}
      </section>

      <section className="space-y-3" aria-label={t('profile.overview')}>
        <h3 className="text-sm font-bold ui-muted tracking-wide uppercase">{t('profile.overview')}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setIsTagsModalOpen(true)}
            className="ui-card p-4 text-left space-y-3 w-full transition hover:ring-2 hover:ring-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-center gap-2 text-sm font-bold ui-heading">
              <Tag size={16} className="text-blue-600" />
              {t('profile.overviewTags')}
              <span className="ml-auto text-xs font-semibold ui-muted">
                {selectedTags.length}/{maxTags}
              </span>
              <ChevronRight size={16} className="text-slate-400" />
            </div>
            {selectedTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((slug) => (
                  <span
                    key={slug}
                    className="inline-flex items-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 px-2 py-1 text-xs font-semibold"
                  >
                    {tagLabel(slug)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs ui-muted">{t('profile.noTagsProfile')}</p>
            )}
            <p className="text-xs font-semibold text-blue-600">{t('profile.overviewTapEdit')}</p>
          </button>

          <button
            type="button"
            onClick={() => setIsExamModalOpen(true)}
            className="ui-card p-4 text-left space-y-3 w-full transition hover:ring-2 hover:ring-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-center gap-2 text-sm font-bold ui-heading">
              <BookOpen size={16} className="text-blue-600" />
              {t('profile.overviewExam')}
              <ChevronRight size={16} className="ml-auto text-slate-400" />
            </div>
            <p className="text-2xl font-bold ui-heading tracking-tight">
              {activeExam}
              <span className="ml-2 text-lg font-semibold text-blue-600">{scores[activeExam]}</span>
            </p>
            <p className="text-xs font-semibold text-blue-600">{t('profile.overviewTapEdit')}</p>
          </button>

          <div className="ui-card p-4 text-left space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold ui-heading">
              <Zap size={16} className="text-amber-500" />
              {t('profile.overviewAi')}
            </div>
            <p className="text-2xl font-bold ui-heading tracking-tight">
              {t('profile.overviewAiUnit', { used: aiUsed, limit: aiLimit })}
            </p>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  aiLeft === 0 ? 'bg-rose-500' : 'bg-blue-600',
                )}
                style={{ width: `${Math.min(100, (aiUsed / aiLimit) * 100)}%` }}
              />
            </div>
            <p className="text-xs ui-muted">
              {aiLeft === 0
                ? t('profile.overviewAiFull')
                : t('profile.overviewAiLeft', { left: aiLeft })}
            </p>
            <p className="text-xs ui-muted">{t('profile.overviewAiReadonly')}</p>
          </div>
        </div>
      </section>

      {saveError && <p className="text-sm text-red-500 text-center">{saveError}</p>}
      {crawlSynced && (
        <p className="text-xs text-emerald-600 text-center">{t('profile.crawlSynced')}</p>
      )}

      {/* <button
        type="button"
        onClick={handleSaveProfile}
        className="w-full bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-slate-800 active:scale-[0.99] transition flex items-center justify-center gap-2 shadow"
      >
        {isSaved ? (
          <>
            <CheckCircle2 size={18} className="text-emerald-400" fill="currentColor" />
            <span>{t('profile.saved')}</span>
          </>
        ) : (
          <>
            <Save size={18} />
            <span>{t('profile.saveAll')}</span>
          </>
        )}
      </button> */}
      <LogoutButton />

      {isTagsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 ui-overlay"
            onClick={() => setIsTagsModalOpen(false)}
            role="presentation"
          />
          <div className="ui-modal w-full max-w-md relative z-10 p-6 space-y-4 overflow-visible animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b ui-divider">
              <h4 className="text-lg font-bold ui-heading">{t('profile.tags')}</h4>
              <button
                type="button"
                onClick={() => setIsTagsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-600 dark:hover:text-gray-300 transition"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs ui-muted">
              {t('profile.tagsDesc', { current: selectedTags.length, max: maxTags })}
            </p>
            <div className="flex flex-wrap gap-2 py-1">
              {ALL_SELECTABLE_TAGS.map((tag) => renderTagButton(tag.slug, tag.en))}
            </div>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {t('profile.saveAll')}
            </button>
          </div>
        </div>
      )}

      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 ui-overlay"
            onClick={() => setIsExamModalOpen(false)}
            role="presentation"
          />
          <div className="ui-modal w-full max-w-md relative z-10 p-6 space-y-5 overflow-visible animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b ui-divider">
              <h4 className="text-lg font-bold ui-heading">{t('profile.exam')}</h4>
              <button
                type="button"
                onClick={() => setIsExamModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-600 dark:hover:text-gray-300 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(['IELTS', 'TOEFL', 'TOEIC'] as ExamType[]).map((exam) => (
                <button
                  key={exam}
                  type="button"
                  onClick={() => setActiveExam(exam)}
                  className={cn(
                    'py-3 px-4 rounded-xl font-bold text-center transition border',
                    activeExam === exam
                      ? 'ui-chip-selected shadow-sm'
                      : 'ui-chip-default border-transparent',
                  )}
                >
                  {exam}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold ui-muted">{t('profile.selectScore')}</label>
              <select
                value={scores[activeExam]}
                onChange={(e) =>
                  setScores((prev) => ({ ...prev, [activeExam]: e.target.value }))
                }
                className="w-full ui-input py-3 px-4 font-medium"
              >
                {renderScoreOptions()}
              </select>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-xl p-4 flex gap-3 items-start text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
              <Sparkles className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <p>
                {t('profile.aiHint', {
                  exam: activeExam,
                  score: scores[activeExam],
                  limit: aiLimit,
                })}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <Save size={16} />
              {t('profile.saveAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
