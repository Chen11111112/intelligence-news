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

} from 'lucide-react';

import {

  loadUserProfile,

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

import SectionHeader from '@/components/Profile/SectionHeader';

import { SelectedTagsChips } from '@/components/SelectedTagsChips';

import { mergeAISummariesFromCloud } from '@/lib/ai-summaries';

import { DEFAULT_UI_LOCALE } from '@/lib/locale';

import type { Session } from 'next-auth';

import LogoutButton from '../LogoutButton';



type ExamType = ExamTarget;



interface ProfileFormProps {

  session: Session;

}



export default function ProfileForm({ session }: ProfileFormProps) {

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

  const [isExamSettingsOpen, setIsExamSettingsOpen] = useState(false);

  const [dbLoaded, setDbLoaded] = useState(false);

  const [dbError, setDbError] = useState<string | null>(null);



  const maxTags = getMaxTags();

  const aiLimit = getDailyAILimit();



  useEffect(() => {

    if (!session.user?.id || dbLoaded) return;



    loadUserProfile()

      .then((profile) => {

        if (!profile) return;

        update({

          examType: profile.examType,

          examScores: profile.examScores,

          tagPreferences: clampTagPreferences(profile.tagPreferences ?? []),

          topicPreferences: profile.topicPreferences,

          bookmarks: profile.bookmarks,

          aiUsage: profile.aiUsage,

        });

        loadAISummariesFromDb().then((cloud) => {

          if (Object.keys(cloud).length > 0) mergeAISummariesFromCloud(cloud);

        });

        loadAIUsageFromDb().then((usage) => {

          if (usage) update({ aiUsage: usage });

        });

        setDbLoaded(true);

      })

      .catch((err) => {

        setDbError(err instanceof Error ? err.message : '無法載入個人設定，請稍後再試。');

        setDbLoaded(true);

      });

  }, [session.user?.id, dbLoaded, update]);



  useEffect(() => {

    if (!settings) return;

    setActiveExam(settings.examType);

    setScores(settings.examScores);

    setSelectedTags(settings.tagPreferences);

  }, [settings]);



  const toggleTag = (slug: string) => {

    setSelectedTags((prev) => {

      if (prev.includes(slug)) return prev.filter((t) => t !== slug);

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

      uiLocale: DEFAULT_UI_LOCALE,

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



    setIsSaved(true);

    setTimeout(() => setIsSaved(false), 2000);

  };



  const renderScoreOptions = () => {

    if (activeExam === 'IELTS') {

      return ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map((s) => (

        <option key={s} value={s}>{s} ?</option>

      ));

    }

    if (activeExam === 'TOEFL') {

      return ['60', '70', '80', '90', '100', '110', '120'].map((s) => (

        <option key={s} value={s}>{s} ?</option>

      ));

    }

    return ['550', '650', '750', '850', '950'].map((s) => (

      <option key={s} value={s}>{s} ?</option>

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



  if (!ready || (session.user?.id && !dbLoaded)) {

    return <div className="text-center ui-muted pt-12">{t('profile.loading')}</div>;

  }



  return (

    <div className="space-y-10">

      <section className="flex flex-col items-center text-center">

        <div className="relative w-32 h-32 mb-6">

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

        <h2 className="text-3xl font-bold ui-heading">{session.user?.name || 'David Chen'}</h2>

        <p className="ui-muted font-medium mt-1 flex items-center gap-2">

          <Award size={18} className="text-amber-500" />

          {t('profile.member', { exam: activeExam, score: scores[activeExam] })}

        </p>

        <p className="text-xs ui-muted mt-2">

          {t('profile.usageLimits', { ai: aiLimit, tags: maxTags })}

        </p>

        {dbError && <p className="text-xs text-red-500 mt-2">{dbError}</p>}

        <SelectedTagsChips

          tagSlugs={selectedTags}

          className="mt-4 max-w-lg mx-auto text-left"

          emptyMessage={t('profile.noTagsProfile')}

        />

      </section>



      <section className="ui-card p-6 space-y-4">

        <SectionHeader

          icon={<Tag className="text-blue-600" size={22} />}

          title={t('profile.tags')}

          onViewMore={() => setIsTagsModalOpen(true)}

        />

        <p className="text-sm ui-muted">

          {t('profile.tagsDesc', { current: selectedTags.length, max: maxTags })}

        </p>

        <SelectedTagsChips

          tagSlugs={selectedTags}

          className="p-4 rounded-xl ui-card-muted"

          emptyMessage={t('profile.noTagsYet')}

        />

        <div className="grid grid-cols-2 gap-3">

          {ALL_SELECTABLE_TAGS.map((tag) => renderTagButton(tag.slug, tag.en))}

        </div>

        {crawlSynced && (

          <p className="text-xs text-emerald-600">{t('profile.crawlSynced')}</p>

        )}

      </section>



      <section className="ui-card p-6 space-y-4">

        <div className="flex items-center justify-between">

          <SectionHeader

            icon={<BookOpen className="text-blue-600" size={22} />}

            title={t('profile.exam')}

            showAiUsage

            setIsExamSettingsOpen={setIsExamSettingsOpen}

          />

        </div>



        {!isExamSettingsOpen ? (

          <p className="text-sm ui-muted">

            {t('profile.examCurrent', { exam: activeExam, score: scores[activeExam] })}

          </p>

        ) : (

          <div className="space-y-6">

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

          </div>

        )}



        {saveError && <p className="text-sm text-red-500">{saveError}</p>}

      </section>



      <button

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

      </button>

      <LogoutButton />



      {isTagsModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">

          <div

            className="absolute inset-0 ui-overlay"

            onClick={() => setIsTagsModalOpen(false)}

            role="presentation"

          />

          <div className="ui-modal w-full max-w-md overflow-hidden relative z-10 p-6 space-y-4 max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between pb-3 border-b ui-divider shrink-0">

              <h4 className="text-lg font-bold ui-heading">{t('profile.allTags')}</h4>

              <button

                type="button"

                onClick={() => setIsTagsModalOpen(false)}

                className="p-1 rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-600 dark:hover:text-gray-300 transition"

              >

                <X size={20} />

              </button>

            </div>

            <p className="text-xs ui-muted shrink-0">

              {t('profile.tagsDesc', { current: selectedTags.length, max: maxTags })}

            </p>

            <div className="overflow-y-auto pr-1 flex-1 py-2">

              <div className="flex flex-wrap gap-2">

                {ALL_SELECTABLE_TAGS.map((tag) => renderTagButton(tag.slug, tag.en))}

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

