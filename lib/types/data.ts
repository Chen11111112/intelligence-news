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

function isUselessLocaleHint(value: string): boolean {
  const v = value.trim().toLowerCase();
  return !v || v === 'zh-hant' || v === 'zh-tw' || v === 'traditional chinese' || v === '繁體中文';
}

/** 將模型各種變體欄位（stem / correct / answer 等）統一為 QuizQuestion */
export function coerceQuizItem(raw: unknown, index: number): QuizQuestion {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`第 ${index + 1} 題格式錯誤`);
  }

  const r = raw as Record<string, unknown>;
  const question = String(r.question ?? r.stem ?? r.text ?? '').trim();
  if (!question) {
    throw new Error(`第 ${index + 1} 題缺少問題文字`);
  }

  let options = Array.isArray(r.options) ? r.options.map((o) => String(o).trim()).filter(Boolean) : [];
  if (options.length < 2) {
    throw new Error(`第 ${index + 1} 題選項不足`);
  }
  while (options.length < 4) {
    options.push(`Option ${String.fromCharCode(65 + options.length)}`);
  }
  options = options.slice(0, 4);

  let correct_index = -1;
  if (typeof r.correct_index === 'number' && Number.isInteger(r.correct_index)) {
    correct_index = r.correct_index;
  } else if (typeof r.correctIndex === 'number' && Number.isInteger(r.correctIndex)) {
    correct_index = r.correctIndex;
  } else if (typeof r.correct_index === 'string') {
    correct_index = Number.parseInt(r.correct_index, 10);
  } else {
    const answer = String(r.correct ?? r.answer ?? r.correct_answer ?? '').trim();
    if (answer) {
      const exact = options.findIndex((o) => o.toLowerCase() === answer.toLowerCase());
      if (exact >= 0) correct_index = exact;
      else {
        const fuzzy = options.findIndex(
          (o) =>
            answer.toLowerCase().includes(o.toLowerCase()) ||
            o.toLowerCase().includes(answer.toLowerCase()),
        );
        if (fuzzy >= 0) correct_index = fuzzy;
      }
    }
  }

  if (correct_index < 0 || correct_index > 3) {
    correct_index = 0;
  }

  let locale_hint = String(r.locale_hint ?? r.chinese_hint ?? r.hint ?? '').trim();
  const explanation = String(r.explanation ?? r.explain ?? '').trim();
  if (isUselessLocaleHint(locale_hint)) {
    locale_hint = explanation.slice(0, 48) || '依文章上下文理解此字彙';
  }

  return normalizeQuizQuestion({
    question,
    locale_hint,
    options,
    correct_index,
    explanation: explanation || '請參考文章上下文理解此字彙。',
  });
}

export function unwrapQuizPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['questions', 'quiz', 'items', 'data']) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
  }
  throw new Error('AI 回傳格式異常，請再試一次');
}

export function validateQuizQuestions(raw: unknown): QuizQuestion[] {
  const items = unwrapQuizPayload(raw);

  if (items.length < 2) {
    throw new Error('AI 產生的題目不足，請再試一次');
  }

  return items.slice(0, 3).map((item, index) => coerceQuizItem(item, index));
}

export const NEWS_DATA: NewsArticle[] = [];
