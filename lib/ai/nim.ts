import 'server-only';

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';

export const AI_LOGIN_REQUIRED_MESSAGE = '請先登入帳號以使用 AI 功能！';

export type NimChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function getNimConfig() {
  return {
    apiKey: process.env.NVIDIA_API_KEY?.trim() || process.env.NIM_API_KEY?.trim() || '',
    baseUrl: (process.env.NVIDIA_NIM_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model: process.env.NVIDIA_NIM_MODEL?.trim() || DEFAULT_MODEL,
  };
}

export function assertNimApiKey(): void {
  if (!getNimConfig().apiKey) {
    throw new Error('NVIDIA_API_KEY_MISSING');
  }
}

export function extractJsonFromText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const objectStart = trimmed.indexOf('{');
  const arrayStart = trimmed.indexOf('[');
  const start =
    objectStart === -1
      ? arrayStart
      : arrayStart === -1
        ? objectStart
        : Math.min(objectStart, arrayStart);

  if (start === -1) return trimmed;

  const opener = trimmed[start];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === opener) depth += 1;
    if (ch === closer) {
      depth -= 1;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }

  return trimmed.slice(start);
}

export async function nimChatCompletion(
  messages: NimChatMessage[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  assertNimApiKey();
  const { apiKey, baseUrl, model } = getNimConfig();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.3,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`NVIDIA NIM ${response.status}: ${body || response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('AI 回傳內容為空');
  }

  return content;
}

export async function nimChatJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
): Promise<T> {
  const raw = await nimChatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens },
  );
  return JSON.parse(extractJsonFromText(raw)) as T;
}
