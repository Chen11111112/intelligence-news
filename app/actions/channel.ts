'use server';

import { toUserFacingAIError } from '@/lib/ai/errors';
import { assertDeployEnvForAI } from '@/lib/env/runtime';
import { extractJsonFromText, nimChatCompletion, nimChatJSON, AI_ARTICLE_MAX_CHARS } from '@/lib/ai/nim';
import { requireAIAuth } from '@/lib/ai/require-auth';
import { recordAIQuotaUsage, requireAIQuota } from '@/lib/ai/require-quota';
import type { ExamTarget } from '@/lib/data';
import { getArticleText } from '@/lib/article';
import type { ChannelChatMessage, ChannelOralResult } from '@/lib/channel';
import {
  filterOralCorrections,
  normalizeOralCorrectionItem,
} from '@/lib/news/channel';
import { getNewsById } from '@/lib/news';
import { getUserProfileFromDb } from '@/lib/user-profile-db';

const ORAL_FEEDBACK_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    corrected_sentence: { type: 'string' },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          suggestion: { type: 'string' },
          type: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['original', 'suggestion'],
      },
    },
  },
  required: ['reply'],
};

type OralFeedbackPayload = {
  reply?: string;
  response?: string;
  message?: string;
  corrected_sentence?: string;
  corrections?: unknown[];
};

function buildExamPrompt(examType: ExamTarget, examScore: string): string {
  return `${examType} preparation at target level ${examScore}`;
}

function formatHistory(messages: ChannelChatMessage[]): string {
  return messages
    .slice(-12)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`)
    .join('\n');
}

function extractOralReply(parsed: OralFeedbackPayload): string {
  for (const key of ['reply', 'response', 'message'] as const) {
    const value = String(parsed[key] ?? '').trim();
    if (value) return value;
  }
  return '';
}

async function assertBookmarked(articleId: string, userId: string, email?: string | null) {
  const profile = await getUserProfileFromDb(userId, email);
  if (!profile.bookmarks.includes(articleId)) {
    throw new Error('僅能討論已收藏的文章');
  }
}

export async function channelDiscuss(
  articleId: string,
  messages: ChannelChatMessage[],
  examType: ExamTarget = 'IELTS',
  examScore: string = '7.5',
): Promise<string> {
  const session = await requireAIAuth();

  try {
    assertDeployEnvForAI();
    await requireAIQuota(session.user.id!, articleId);
    await assertBookmarked(articleId, session.user.id!, session.user.email);
    const article = await getNewsById(articleId);
    if (!article) throw new Error('找不到文章');

    const articleText = getArticleText(article).slice(0, AI_ARTICLE_MAX_CHARS);
    const history = formatHistory(messages);
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

    const systemPrompt = `You are a friendly English tutor helping a learner discuss a news article (${buildExamPrompt(examType, examScore)}).
Write all non-English learner fields in Traditional Chinese.
Reply in English (2-4 short paragraphs). You may add brief clarifications in Traditional Chinese when explaining difficult vocabulary or concepts.
Encourage the learner to share opinions and ask follow-up questions in English.`;

    const userPrompt = `Article title: ${article.titleEn}
Article excerpt:
${articleText}

Conversation so far:
${history || '(new conversation)'}

Latest learner message: ${lastUser}`;

    const text = await nimChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 2048 },
    );

    const reply = text.trim();
    if (!reply) throw new Error('AI 回傳內容為空');
    await recordAIQuotaUsage(session.user.id!, articleId);
    return reply;
  } catch (error) {
    console.error('channelDiscuss:', error);
    throw toUserFacingAIError(error, '無法取得 AI 回覆，請稍後再試');
  }
}

export async function channelOralFeedback(
  articleId: string,
  transcript: string,
  messages: ChannelChatMessage[],
  examType: ExamTarget = 'IELTS',
  examScore: string = '7.5',
): Promise<ChannelOralResult> {
  const session = await requireAIAuth();

  try {
    assertDeployEnvForAI();
    if (!transcript.trim()) throw new Error('沒有辨識到語音內容');
    await requireAIQuota(session.user.id!, articleId);
    await assertBookmarked(articleId, session.user.id!, session.user.email);

    const article = await getNewsById(articleId);
    if (!article) throw new Error('找不到文章');

    const articleText = getArticleText(article).slice(0, AI_ARTICLE_MAX_CHARS);
    const history = formatHistory(messages);

    const systemPrompt = `You are a warm, supportive English speaking coach for ${buildExamPrompt(examType, examScore)}.
Write all non-English learner fields in Traditional Chinese.
Return ONLY valid JSON: reply (string), corrected_sentence (string, optional), corrections (array, max 2 items).
Each correction: {original, suggestion, type, explanation}. type: grammar | pronunciation | vocabulary | fluency.
Write explanation in Traditional Chinese.

Coaching style:
- Be encouraging. Start reply by acknowledging what the learner expressed well.
- The transcript is from speech recognition and often has STT errors — do NOT correct likely misheard words.
- Only flag 0-2 clear issues that block understanding or are obvious grammar mistakes.
- Ignore minor word-order preferences, filler words, or stylistic differences.
- If the message is understandable, return corrections as [] and leave corrected_sentence empty.
- Keep reply conversational (2-3 short paragraphs), then invite them to continue in English.`;

    const userPrompt = `The learner spoke aloud about this news article.

Article title: ${article.titleEn}
Article excerpt:
${articleText}

Prior conversation:
${history || '(none)'}

Learner's spoken transcript (may contain STT noise):
"${transcript.trim()}"

Tasks:
1. Understand what they meant about the article.
2. Reply warmly in English; praise effort before any correction.
3. At most 2 corrections — only if truly needed. Otherwise corrections: [].
4. corrected_sentence only when you rewrote a confusing sentence; otherwise "".`;

    let parsed: OralFeedbackPayload;
    try {
      parsed = await nimChatJSON<OralFeedbackPayload>(systemPrompt, userPrompt, 3072, {
        temperature: 0.35,
        guidedJson: ORAL_FEEDBACK_JSON_SCHEMA,
        retries: 1,
      });
    } catch (jsonError) {
      console.warn('channelOralFeedback JSON failed, retrying without schema:', jsonError);
      const raw = await nimChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { maxTokens: 3072 },
      );
      parsed = JSON.parse(extractJsonFromText(raw)) as OralFeedbackPayload;
    }

    let reply = extractOralReply(parsed);
    if (!reply) {
      reply = (
        await channelDiscuss(
          articleId,
          [...messages, { role: 'user', content: transcript.trim() }],
          examType,
          examScore,
        )
      ).trim();
    }
    if (!reply) {
      throw new Error('AI 回傳內容為空');
    }

    const transcriptNorm = transcript.trim().toLowerCase();
    const corrected = String(parsed.corrected_sentence ?? '').trim();
    const corrections = filterOralCorrections(
      (parsed.corrections ?? [])
        .map(normalizeOralCorrectionItem)
        .filter((item): item is NonNullable<typeof item> => item !== null),
    );

    await recordAIQuotaUsage(session.user.id!, articleId);

    return {
      reply,
      correctedSentence:
        corrected && corrected.toLowerCase() !== transcriptNorm ? corrected : '',
      corrections,
    };
  } catch (error) {
    console.error('channelOralFeedback:', error);
    throw toUserFacingAIError(error, '無法分析口說內容，請稍後再試');
  }
}
