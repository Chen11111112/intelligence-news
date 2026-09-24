import 'server-only';

/** NTUB LiteLLM（OpenAI 相容）；見 https://chatapi.ntubimdbirc.tw/ */
const DEFAULT_BASE_URL = 'https://chatapi.ntubimdbirc.tw/v1';
const DEFAULT_MODEL = 'Gemma4-31B';
const DEFAULT_TIMEOUT_MS = 120_000;
/** Gemma 會先產生 reasoning tokens，需預留較大輸出空間 */
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

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
  /** OpenAI / LiteLLM structured output（json_schema） */
  guidedJson?: Record<string, unknown>;
};

function getNimConfig() {
  const timeoutRaw =
    process.env.CHATAPI_TIMEOUT_MS?.trim() ||
    process.env.NVIDIA_NIM_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : DEFAULT_TIMEOUT_MS;

  return {
    apiKey:
      process.env.CHATAPI_API_KEY?.trim() ||
      process.env.AI_API_KEY?.trim() ||
      process.env.NVIDIA_API_KEY?.trim() ||
      process.env.NIM_API_KEY?.trim() ||
      '',
    baseUrl: (
      process.env.CHATAPI_BASE_URL?.trim() ||
      process.env.NVIDIA_NIM_BASE_URL?.trim() ||
      DEFAULT_BASE_URL
    ).replace(/\/+$/, ''),
    model:
      process.env.CHATAPI_MODEL?.trim() ||
      process.env.NVIDIA_NIM_MODEL?.trim() ||
      DEFAULT_MODEL,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

export function assertNimApiKey(): void {
  if (!getNimConfig().apiKey) {
    throw new Error('CHATAPI_API_KEY_MISSING');
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

function pickMessageContent(message: {
  content?: string | null;
  reasoning_content?: string | null;
}): string | null {
  if (typeof message.content === 'string' && message.content.trim()) {
    return message.content;
  }
  if (typeof message.reasoning_content === 'string' && message.reasoning_content.trim()) {
    return message.reasoning_content;
  }
  return null;
}

export async function nimChatCompletion(
  messages: NimChatMessage[],
  options?: NimChatOptions,
): Promise<string> {
  assertNimApiKey();
  const { apiKey, baseUrl, model, timeoutMs } = getNimConfig();
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: options?.temperature ?? 0.3,
  };

  if (options?.guidedJson) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'structured_response',
        schema: options.guidedJson,
        strict: false,
      },
    };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options?.timeoutMs ?? timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error('ChatAPI timeout: AI 回應逾時，請稍後再試');
    }
    throw error;
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`ChatAPI ${response.status}: ${errBody || response.statusText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        reasoning_content?: string | null;
      };
    }>;
  };
  const content = data.choices?.[0]?.message
    ? pickMessageContent(data.choices[0].message)
    : null;
  if (!content) {
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
        (message.includes('400') ||
          message.includes('422') ||
          message.includes('guided') ||
          message.includes('json_schema') ||
          message.includes('response_format'));
      if (guidedRejected && attempt === 0) {
        chatOptions.guidedJson = undefined;
        continue;
      }
      if (attempt < retries) continue;
    }
  }

  throw lastError;
}
