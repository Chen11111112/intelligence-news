import 'server-only';

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
/** 較小模型回應較快；70B 模型在 Nginx 60s 限制下容易 504 */
const DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 1536;

export const AI_LOGIN_REQUIRED_MESSAGE = '請先登入帳號以使用 AI 功能！';
export const AI_ARTICLE_MAX_CHARS = 6000;
/** 測驗只需關鍵段落，縮短輸入可明顯加快回應 */
export const AI_QUIZ_MAX_CHARS = 3500;

export type NimChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type NimChatOptions = {
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** NVIDIA NIM structured output（integrate API 使用 nvext.guided_json） */
  guidedJson?: Record<string, unknown>;
};

function getNimConfig() {
  const timeoutRaw = process.env.NVIDIA_NIM_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : DEFAULT_TIMEOUT_MS;

  return {
    apiKey: process.env.NVIDIA_API_KEY?.trim() || process.env.NIM_API_KEY?.trim() || '',
    baseUrl: (process.env.NVIDIA_NIM_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model: process.env.NVIDIA_NIM_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
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
  options?: NimChatOptions,
): Promise<string> {
  assertNimApiKey();
  const { apiKey, baseUrl, model, timeoutMs } = getNimConfig();
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: options?.temperature ?? 0.3,
        ...(options?.guidedJson
          ? { nvext: { guided_json: options.guidedJson } }
          : {}),
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error('NVIDIA NIM timeout: AI 回應逾時，請稍後再試或改用較小的模型');
    }
    throw error;
  }

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

export type NimChatJSONOptions = {
  maxTokens?: number;
  temperature?: number;
  guidedJson?: Record<string, unknown>;
  /** 解析失敗或 API 錯誤時的重試次數（不含首次） */
  retries?: number;
};

function parseNimJsonResponse<T>(raw: string): T {
  try {
    return JSON.parse(extractJsonFromText(raw)) as T;
  } catch (error) {
    const snippet = raw.slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(
      `AI JSON parse failed: ${error instanceof Error ? error.message : String(error)} | ${snippet}`,
    );
  }
}

export async function nimChatJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  options?: NimChatJSONOptions,
): Promise<T> {
  const retries = options?.retries ?? 1;
  const messages: NimChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const chatOptions = {
    maxTokens: options?.maxTokens ?? maxTokens,
    temperature: options?.temperature,
    guidedJson: options?.guidedJson,
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const raw = await nimChatCompletion(messages, chatOptions);
      return parseNimJsonResponse<T>(raw);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const guidedRejected =
        chatOptions.guidedJson &&
        (message.includes('400') || message.includes('422') || message.includes('guided'));
      if (guidedRejected && attempt === 0) {
        chatOptions.guidedJson = undefined;
        continue;
      }
      if (attempt < retries) continue;
    }
  }

  throw lastError;
}
