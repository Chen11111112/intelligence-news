'use server';

import { assertDeployEnvForAI } from '@/lib/env/runtime';
import { toUserFacingAIError } from '@/lib/ai/errors';
import { nimChatJSON, AI_ARTICLE_MAX_CHARS, AI_QUIZ_MAX_CHARS } from '@/lib/ai/nim';
import { requireAIAuth } from '@/lib/ai/require-auth';
import { recordAIQuotaUsage, requireAIQuota } from '@/lib/ai/require-quota';
import type { ExamTarget } from '@/lib/data';
import {
  normalizeAISummary,
  validateQuizQuestions,
  type AISummary,
} from '@/lib/data';

const QUIZ_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          locale_hint: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correct_index: { type: 'integer' },
          explanation: { type: 'string' },
        },
        required: ['question', 'locale_hint', 'options', 'correct_index', 'explanation'],
      },
    },
  },
  required: ['questions'],
};

const QUIZ_EXAMPLE = `{"questions":[
  {"question":"What does 'mitigate' mean in this article?","locale_hint":"減輕、緩和","options":["worsen","reduce","ignore","celebrate"],"correct_index":1,"explanation":"mitigate 意為減輕或緩和某種負面影響。"},
  {"question":"Which word is closest in meaning to 'surge'?","locale_hint":"激增、湧現","options":["decline","increase sharply","remain stable","disappear"],"correct_index":1,"explanation":"surge 在此指快速大幅上升。"},
  {"question":"The article suggests policymakers should ___ inflation.","locale_hint":"選出最符合文意的動詞","options":["ignore","address","celebrate","eliminate"],"correct_index":1,"explanation":"address 表示正面處理或設法因應問題。"}
]}`;

function buildExamPrompt(examType: ExamTarget, examScore: string): string {
  return `${examType} preparation at target level ${examScore}. Match vocabulary depth, sentence complexity, and explanations to this level.`;
}

export async function generateSummary(
  articleId: string,
  text: string,
  examType: ExamTarget = 'IELTS',
  examScore: string = '7.5',
) {
  const session = await requireAIAuth();

  try {
    assertDeployEnvForAI();
    if (!articleId?.trim()) throw new Error('請提供文章 ID');
    if (!text) throw new Error('請提供文章內容');

    await requireAIQuota(session.user.id!, articleId);

    const trimmed = text.slice(0, AI_ARTICLE_MAX_CHARS);
    const systemPrompt = `You are an academic English tutor. Return ONLY valid JSON, no markdown fences or extra text.`;
    const userPrompt = `Act as an academic English tutor for ${buildExamPrompt(examType, examScore)}.
Summarize the following news article for language learners.
Use Traditional Chinese (Taiwan) for summary_local and key_points_local.

Return JSON with these fields:
- "summary_en": 2-3 concise paragraphs in academic English appropriate for the learner level
- "summary_local": translation/explanation in Traditional Chinese for the learner
- "key_points_en": array of 3-5 bullet-point takeaways in English
- "key_points_local": array of 3-5 bullet-point takeaways in Traditional Chinese (same order as key_points_en)

Text: ${trimmed}`;

    const parsed = await nimChatJSON<AISummary>(systemPrompt, userPrompt, 4096);
    const summary = normalizeAISummary(parsed);
    await recordAIQuotaUsage(session.user.id!, articleId);
    return summary;
  } catch (error) {
    console.error('Server Action Summary Error:', error);
    throw toUserFacingAIError(error, '無法生成文章摘要，請稍後再試');
  }
}

export async function generateQuiz(
  articleId: string,
  text: string,
  examType: ExamTarget = 'IELTS',
  examScore: string = '7.5',
) {
  const session = await requireAIAuth();

  try {
    assertDeployEnvForAI();
    if (!articleId?.trim()) throw new Error('請提供文章 ID');
    const trimmed = text?.trim();
    if (!trimmed || trimmed.length < 80) {
      throw new Error('文章內容尚未載入完成，請稍候再試');
    }

    await requireAIQuota(session.user.id!, articleId);

    const articleExcerpt = trimmed.slice(0, AI_QUIZ_MAX_CHARS);
    const systemPrompt =
      'You are an academic English tutor. Return ONLY valid JSON with a "questions" array of exactly 3 objects. No markdown.';
    const userPrompt = `Create a 3-question vocabulary quiz for ${buildExamPrompt(examType, examScore)}.
Pick academic words from the article. Each question needs: question (English), locale_hint (Traditional Chinese), options (4 English strings), correct_index (0-3), explanation (Traditional Chinese).

Return this exact shape:
${QUIZ_EXAMPLE}

Article:
${articleExcerpt}`;

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const parsed = await nimChatJSON<unknown>(systemPrompt, userPrompt, 3072, {
          temperature: 0.25,
          guidedJson: attempt === 0 ? QUIZ_JSON_SCHEMA : undefined,
          retries: 0,
        });
        const questions = validateQuizQuestions(parsed);
        if (questions.length >= 2) {
          await recordAIQuotaUsage(session.user.id!, articleId);
          return questions;
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('AI 產生的題目不足，請再試一次');
  } catch (error) {
    console.error('Server Action Quiz Error:', error);
    throw toUserFacingAIError(error, '無法生成 AI 測驗，請稍後再試');
  }
}
