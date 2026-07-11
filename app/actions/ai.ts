'use server';

import { toUserFacingAIError } from '@/lib/ai/errors';
import { extractJsonFromText, nimChatCompletion, nimChatJSON } from '@/lib/ai/nim';
import { requireAIAuth } from '@/lib/ai/require-auth';
import type { ExamTarget } from '@/lib/data';
import { normalizeAISummary, normalizeQuizQuestion, type AISummary, type QuizQuestion } from '@/lib/data';
import { getLocaleAIInstructions, getLocaleAIName } from '@/lib/locale';

function buildExamPrompt(examType: ExamTarget, examScore: string): string {
  return `${examType} preparation at target level ${examScore}. Match vocabulary depth, sentence complexity, and explanations to this level.`;
}

export async function generateSummary(
  text: string,
  examType: ExamTarget = 'IELTS',
  examScore: string = '7.5',
) {
  await requireAIAuth();

  try {
    if (!text) throw new Error('請提供文章內容');

    const localeName = getLocaleAIName();
    const trimmed = text.slice(0, 12000);
    const systemPrompt = `You are an academic English tutor. Return ONLY valid JSON, no markdown fences or extra text.`;
    const userPrompt = `Act as an academic English tutor for ${buildExamPrompt(examType, examScore)}.
Summarize the following news article for language learners.
Use Traditional Chinese (Taiwan) for summary_local and key_points_local.

Return JSON with these fields:
- "summary_en": 2-3 concise paragraphs in academic English appropriate for the learner level
- "summary_local": translation/explanation in ${localeName} for the learner
- "key_points_en": array of 3-5 bullet-point takeaways in English
- "key_points_local": array of 3-5 bullet-point takeaways in ${localeName} (same order as key_points_en)

Text: ${trimmed}`;

    const parsed = await nimChatJSON<AISummary>(systemPrompt, userPrompt, 4096);
    return normalizeAISummary(parsed);
  } catch (error) {
    console.error('Server Action Summary Error:', error);
    throw toUserFacingAIError(error, '無法生成文章摘要，請稍後再試');
  }
}

export async function generateQuiz(
  text: string,
  examType: ExamTarget = 'IELTS',
  examScore: string = '7.5',
) {
  await requireAIAuth();

  try {
    if (!text) throw new Error('請提供文章內容');

    const localeName = getLocaleAIName();
    const localeInstructions = getLocaleAIInstructions();
    const trimmed = text.slice(0, 12000);
    const systemPrompt = `You are an academic English tutor. Return ONLY a valid JSON array, no markdown fences or extra text.`;
    const userPrompt = `Generate a 3-question vocabulary quiz for ${buildExamPrompt(examType, examScore)} based on the news article below.
Focus on high-value academic vocabulary, contextual meaning, and synonym discrimination at the learner's level.

${localeInstructions}

Return ONLY a valid JSON array of 3 objects. Each object must have:
"question" (English), "locale_hint" (hint in ${localeName}),
"options" (array of exactly 4 English strings), "correct_index" (0-3),
"explanation" (answer explanation in ${localeName}).

Text: ${trimmed}`;

    const parsed = await nimChatJSON<QuizQuestion[]>(systemPrompt, userPrompt, 4096);
    return parsed.map((q) => normalizeQuizQuestion(q));
  } catch (error) {
    console.error('Server Action Quiz Error:', error);
    throw toUserFacingAIError(error, '無法生成 AI 測驗，請稍後再試');
  }
}
