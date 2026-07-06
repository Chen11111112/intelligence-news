export type Topic =
  | 'Arts + Culture'
  | 'Business & Economy'
  | 'Education'
  | 'Environment & Energy'
  | 'Ethics & Religion'
  | 'Health'
  | 'Politics & Society'
  | 'Science & Tech'
  | 'World';
export type ExamTarget = 'IELTS' | 'TOEFL' | 'TOEIC';

export interface NewsArticle {
  id: string;
  topic: Topic;
  tagSlugs?: string[];
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  readTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  imageUrl: string;
  sourceUrl?: string;
  sourceName?: string;
  fullContentEn?: string;
  publishedAt?: string;
}

export interface AISummary {
  summary_en: string;
  /** @deprecated use summary_local */
  summary_zh?: string;
  summary_local: string;
  key_points_en?: string[];
  /** @deprecated use key_points_local */
  key_points_zh?: string[];
  key_points_local?: string[];
}

export function normalizeAISummary(raw: AISummary): AISummary {
  return {
    ...raw,
    summary_local: raw.summary_local ?? raw.summary_zh ?? '',
    key_points_local: raw.key_points_local ?? raw.key_points_zh,
  };
}

export interface QuizQuestion {
  question: string;
  /** @deprecated use locale_hint */
  chinese_hint?: string;
  locale_hint: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export function normalizeQuizQuestion(raw: QuizQuestion): QuizQuestion {
  return {
    ...raw,
    locale_hint: raw.locale_hint ?? raw.chinese_hint ?? '',
  };
}

export const NEWS_DATA: NewsArticle[] = [];
