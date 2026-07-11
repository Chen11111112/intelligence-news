'use server';

import { toUserFacingAIError } from '@/lib/ai/errors';
import { extractJsonFromText, nimChatCompletion } from '@/lib/ai/nim';
import { requireAIAuth } from '@/lib/ai/require-auth';
import type { ExamTarget } from '@/lib/data';
import { getArticleText } from '@/lib/article';
import type { ChannelChatMessage, ChannelOralResult } from '@/lib/channel';
import { getLocaleAIInstructions, getLocaleAIName } from '@/lib/locale';
import { getNewsById } from '@/lib/news';
import { getUserProfileFromDb } from '@/lib/user-profile-db';

function buildExamPrompt(examType: ExamTarget, examScore: string): string {
  return `${examType} preparation at target level ${examScore}`;
}

function formatHistory(messages: ChannelChatMessage[]): string {
  return messages
    .slice(-12)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`)
    .join('\n');
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
    await assertBookmarked(articleId, session.user.id!, session.user.email);
    const article = await getNewsById(articleId);
    if (!article) throw new Error('找不到文章');

    const localeName = getLocaleAIName();
    const localeInstructions = getLocaleAIInstructions();
    const articleText = getArticleText(article).slice(0, 10000);
    const history = formatHistory(messages);
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

    const systemPrompt = `You are a friendly English tutor helping a learner discuss a news article (${buildExamPrompt(examType, examScore)}).
${localeInstructions}
Reply in English (2-4 short paragraphs). You may add brief clarifications in ${localeName} when explaining difficult vocabulary or concepts.
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
    if (!transcript.trim()) throw new Error('沒有辨識到語音內容');
    await assertBookmarked(articleId, session.user.id!, session.user.email);

    const article = await getNewsById(articleId);
    if (!article) throw new Error('找不到文章');

    const localeName = getLocaleAIName();
    const localeInstructions = getLocaleAIInstructions();
    const articleText = getArticleText(article).slice(0, 8000);
    const history = formatHistory(messages);

    const systemPrompt = `You are an English speaking coach for ${buildExamPrompt(examType, examScore)}.
${localeInstructions}
Return ONLY valid JSON with fields: reply (string), corrected_sentence (string), corrections (array of {original, suggestion, type, explanation}).
type must be one of: grammar, pronunciation, vocabulary, fluency.
Write explanation in ${localeName}.`;

    const userPrompt = `The learner spoke aloud about this news article (transcript from speech recognition; may contain STT errors).

Article title: ${article.titleEn}
Article excerpt:
${articleText}

Prior conversation:
${history || '(none)'}

Learner's spoken transcript:
"${transcript.trim()}"

Tasks:
1. Infer what the learner meant to say about the article.
2. Provide a natural corrected English sentence (corrected_sentence).
3. List specific mistakes: grammar, pronunciation hints, vocabulary, or fluency.
4. Reply conversationally in English (reply), briefly continuing the discussion.`;

    const raw = await nimChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 3072 },
    );

    const parsed = JSON.parse(extractJsonFromText(raw)) as {
      reply: string;
      corrected_sentence: string;
      corrections: Array<{
        original: string;
        suggestion: string;
        type: 'grammar' | 'pronunciation' | 'vocabulary' | 'fluency';
        explanation: string;
      }>;
    };

    return {
      reply: parsed.reply,
      correctedSentence: parsed.corrected_sentence,
      corrections: parsed.corrections ?? [],
    };
  } catch (error) {
    console.error('channelOralFeedback:', error);
    throw toUserFacingAIError(error, '無法分析口說內容，請稍後再試');
  }
}
