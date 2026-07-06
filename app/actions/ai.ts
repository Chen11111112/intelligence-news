'use server';



import { GoogleGenAI, Type } from '@google/genai';

import { auth } from '@/app/auth';

import { toUserFacingAIError } from '@/lib/ai/errors';

import type { ExamTarget } from '@/lib/data';

import { normalizeAISummary, normalizeQuizQuestion, type AISummary, type QuizQuestion } from '@/lib/data';

import { getLocaleAIInstructions, getLocaleAIName } from '@/lib/locale';



const GEMINI_MODEL = 'gemini-2.5-flash-lite';



const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });



function assertApiKey() {

  if (!process.env.GEMINI_API_KEY?.trim()) {

    throw new Error('GEMINI_API_KEY_MISSING');

  }

}



function buildExamPrompt(examType: ExamTarget, examScore: string): string {

  return `${examType} preparation at target level ${examScore}. Match vocabulary depth, sentence complexity, and explanations to this level.`;

}



export async function generateSummary(

  text: string,

  examType: ExamTarget = 'IELTS',

  examScore: string = '7.5',

) {

  const session = await auth();

  if (!session) {

    throw new Error('請先登入帳號以使用 AI 功能！');

  }

  try {

    assertApiKey();

    if (!text) throw new Error('請提供文章內容');



    const localeName = getLocaleAIName();

    const localeInstructions = getLocaleAIInstructions();

    const trimmed = text.slice(0, 12000);

    const prompt = `Act as an academic English tutor for ${buildExamPrompt(examType, examScore)}

Summarize the following news article for language learners.

chinese Taiwan.

Return ONLY valid JSON with these fields:

- "summary_en": 2-3 concise paragraphs in academic English appropriate for the learner level

- "summary_local": translation/explanation in ${localeName} for the learner

- "key_points_en": array of 3-5 bullet-point takeaways in English

- "key_points_local": array of 3-5 bullet-point takeaways in ${localeName} (same order as key_points_en)

Text: ${trimmed}`;



    const response = await ai.models.generateContent({

      model: GEMINI_MODEL,

      contents: prompt,

      config: {

        responseMimeType: 'application/json',

        responseSchema: {

          type: Type.OBJECT,

          properties: {

            summary_en: { type: Type.STRING },

            summary_local: { type: Type.STRING },

            key_points_en: { type: Type.ARRAY, items: { type: Type.STRING } },

            key_points_local: { type: Type.ARRAY, items: { type: Type.STRING } },

          },

          required: ['summary_en', 'summary_local', 'key_points_en', 'key_points_local'],

        },

      },

    });



    const responseText = response.text;

    if (!responseText) throw new Error('AI 回傳內容為空');



    const jsonStr = responseText.replace(/```json|```/g, '').trim();

    return normalizeAISummary(JSON.parse(jsonStr) as AISummary);

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

  const session = await auth();

  if (!session) {

    throw new Error('請先登入帳號以使用 AI 功能！');

  }

  try {

    assertApiKey();

    if (!text) throw new Error('請提供文章內容');



    const localeName = getLocaleAIName();

    const localeInstructions = getLocaleAIInstructions();

    const trimmed = text.slice(0, 12000);

    const prompt = `Generate a 3-question vocabulary quiz for ${buildExamPrompt(examType, examScore)} based on the news article below.

Focus on high-value academic vocabulary, contextual meaning, and synonym discrimination at the learner's level.

${localeInstructions}

Return ONLY a valid JSON array of 3 objects. Each object must have:

"question" (English), "locale_hint" (hint in ${localeName}),

"options" (array of exactly 4 English strings), "correct_index" (0-3),

"explanation" (answer explanation in ${localeName}).

Text: ${trimmed}`;



    const response = await ai.models.generateContent({

      model: GEMINI_MODEL,

      contents: prompt,

      config: {

        responseMimeType: 'application/json',

        responseSchema: {

          type: Type.ARRAY,

          items: {

            type: Type.OBJECT,

            properties: {

              question: { type: Type.STRING },

              locale_hint: { type: Type.STRING },

              options: { type: Type.ARRAY, items: { type: Type.STRING } },

              correct_index: { type: Type.NUMBER },

              explanation: { type: Type.STRING },

            },

            required: ['question', 'locale_hint', 'options', 'correct_index', 'explanation'],

          },

        },

      },

    });



    const responseText = response.text;

    if (!responseText) throw new Error('AI 回傳內容為空');



    const jsonStr = responseText.replace(/```json|```/g, '').trim();

    const parsed = JSON.parse(jsonStr) as QuizQuestion[];

    return parsed.map((q) => normalizeQuizQuestion(q));

  } catch (error) {

    console.error('Server Action Quiz Error:', error);

    throw toUserFacingAIError(error, '無法生成 AI 測驗，請稍後再試');

  }

}

