'use server';

import { GoogleGenAI, Type } from '@google/genai';
import { auth } from '@/app/auth';
import { toUserFacingAIError } from '@/lib/ai/errors';
import type { ExamTarget } from '@/lib/data';
import { getArticleText } from '@/lib/article';
import type { ChannelChatMessage, ChannelOralResult } from '@/lib/channel';
import { getLocaleAIInstructions, getLocaleAIName } from '@/lib/locale';
import { getNewsById } from '@/lib/news';
import { getUserProfileFromDb } from '@/lib/user-profile-db';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

function assertApiKey() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
}

function buildExamPrompt(examType: ExamTarget, examScore: string): string {
  return `${examType} preparation at target level ${examScore}`;
}

function formatHistory(messages: ChannelChatMessage[]): string {
  return messages
    .slice(-12)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'Tutor'}: ${m.content}`)
    .join('\n');
}

async function assertBookmarked(articleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('請先登入帳號以使用 AI 功能！');

  const profile = await getUserProfileFromDb(session.user.id, session.user.email);
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
  const session = await auth();
  if (!session) throw new Error('請先登入帳號以使用 AI 功能！');

  try {
    assertApiKey();
    await assertBookmarked(articleId);
    const article = await getNewsById(articleId);
    if (!article) throw new Error('找不到文章');

    const localeName = getLocaleAIName();
    const localeInstructions = getLocaleAIInstructions();
    const articleText = getArticleText(article).slice(0, 10000);
    const history = formatHistory(messages);
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

    const prompt = `You are a friendly English tutor helping a learner discuss a news article (${buildExamPrompt(examType, examScore)}).

Article title: ${article.titleEn}
Article excerpt:
${articleText}

Conversation so far:
${history || '(new conversation)'}

${localeInstructions}
Reply to the learner's latest message in English (2-4 short paragraphs). You may add brief clarifications in ${localeName} when explaining difficult vocabulary or concepts.
Encourage the learner to share opinions and ask follow-up questions in English.
Latest learner message: ${lastUser}`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = response.text?.trim();
    if (!text) throw new Error('AI 回傳內容為空');
    return text;
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
  const session = await auth();
  if (!session) throw new Error('請先登入帳號以使用 AI 功能！');

  try {
    assertApiKey();
    if (!transcript.trim()) throw new Error('沒有辨識到語音內容');
    await assertBookmarked(articleId);

    const article = await getNewsById(articleId);
    if (!article) throw new Error('找不到文章');

    const localeName = getLocaleAIName();
    const localeInstructions = getLocaleAIInstructions();
    const articleText = getArticleText(article).slice(0, 8000);
    const history = formatHistory(messages);

    const prompt = `You are an English speaking coach for ${buildExamPrompt(examType, examScore)}.
The learner spoke aloud about this news article (transcript from speech recognition; may contain STT errors).

Article title: ${article.titleEn}
Article excerpt:
${articleText}

Prior conversation:
${history || '(none)'}

Learner's spoken transcript:
"${transcript.trim()}"

${localeInstructions}
Tasks:
1. Infer what the learner meant to say about the article.
2. Provide a natural corrected English sentence (corrected_sentence).
3. List specific mistakes: grammar, pronunciation hints, vocabulary, or fluency. Write "explanation" in ${localeName}.
4. Reply conversationally in English (reply), briefly continuing the discussion and encouraging better oral expression.

Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            corrected_sentence: { type: Type.STRING },
            corrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                  type: {
                    type: Type.STRING,
                    enum: ['grammar', 'pronunciation', 'vocabulary', 'fluency'],
                  },
                  explanation: { type: Type.STRING },
                },
                required: ['original', 'suggestion', 'type', 'explanation'],
              },
            },
          },
          required: ['reply', 'corrected_sentence', 'corrections'],
        },
      },
    });

    const raw = response.text?.replace(/```json|```/g, '').trim();
    if (!raw) throw new Error('AI 回傳內容為空');

    const parsed = JSON.parse(raw) as {
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
