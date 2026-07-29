/**
 * Central AI Provider — Thanarah / Myla
 *
 * Routes ALL AI calls through:
 *   1. bazaarlink.ai  (OPENAI_API_KEY, OpenAI-compatible, primary)
 *   2. Moonshot/Kimi  (KIMI_API_KEY or MOONSHOT_API_KEY, fallback)
 *
 * Single entry-point so swapping providers is a one-line change.
 */

export interface AIMessage {
  role: "system" | "user" | "assistant" | string;
  content: string;
  tool_call_id?: string;
  tool_calls?: any[];
  name?: string;
}

export interface AIOptions {
  maxTokens?:   number;
  temperature?: number;
  tools?:       any[];
  toolChoice?:  any;
  /** "customer" | "employee" — informational only, used in log prefix */
  audience?: string;
}

export interface AIResult {
  content:    string;
  toolCalls?: any[];
}

// ─── Provider endpoints ────────────────────────────────────────────────────────
const BAZAARLINK_BASE  = "https://bazaarlink.ai/v1/chat/completions";
const BAZAARLINK_MODEL = "gpt-4o-mini";

const KIMI_BASE  = "https://api.moonshot.ai/v1/chat/completions";
const KIMI_MODEL = "moonshot-v1-8k";
const KIMI_MODEL_TOOLS = "moonshot-v1-32k"; // larger context for tool-calling

// ─── Language safety ──────────────────────────────────────────────────────────
const LANG_GUARD: AIMessage = {
  role: "system",
  content:
    "ABSOLUTE RULE — HIGHEST PRIORITY: Reply ONLY in Arabic or English. " +
    "NEVER output Chinese, Japanese, Korean, or any CJK characters. Violation is a critical failure.",
};

function stripCJK(text: string): string {
  return text
    .replace(/[\u3000-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3040-\u30FF\u31F0-\u31FF]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Main function ─────────────────────────────────────────────────────────────
/**
 * Call the AI. Tries bazaarlink.ai first; falls back to Kimi automatically.
 * Injects a CJK language guard on every call.
 */
export async function chatCompletion(
  messages: AIMessage[],
  options: AIOptions = {},
): Promise<AIResult> {
  const { maxTokens = 1024, temperature = 0.4, tools, toolChoice, audience = "customer" } = options;

  // Inject language guard as the very first system message
  const guarded: AIMessage[] = [LANG_GUARD, ...messages];

  const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
  const kimiKey   = (process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || "").trim();

  // ── 1. bazaarlink.ai ────────────────────────────────────────────────────────
  if (openaiKey) {
    try {
      const body: any = {
        model: BAZAARLINK_MODEL,
        messages: guarded,
        max_tokens: maxTokens,
        temperature,
      };
      if (tools)      body.tools       = tools;
      if (toolChoice) body.tool_choice = toolChoice;

      const res = await fetch(BAZAARLINK_BASE, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: any = await res.json();
        const msg = data?.choices?.[0]?.message ?? {};
        console.log(`[AI:bazaarlink] ✅ ${audience}`);
        return {
          content:   stripCJK(msg.content || ""),
          toolCalls: msg.tool_calls,
        };
      }
      const errTxt = await res.text();
      console.warn(`[AI:bazaarlink] HTTP ${res.status} — falling back to Kimi. ${errTxt.slice(0, 120)}`);
    } catch (e: any) {
      console.warn(`[AI:bazaarlink] Error — falling back to Kimi: ${e.message}`);
    }
  }

  // ── 2. Kimi / Moonshot fallback ─────────────────────────────────────────────
  if (kimiKey) {
    const model = tools ? KIMI_MODEL_TOOLS : KIMI_MODEL;
    const body: any = {
      model,
      messages: guarded,
      max_tokens: maxTokens,
      temperature,
    };
    if (tools)      body.tools       = tools;
    if (toolChoice) body.tool_choice = toolChoice;

    const res = await fetch(KIMI_BASE, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${kimiKey}` },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data: any = await res.json();
      const msg = data?.choices?.[0]?.message ?? {};
      console.log(`[AI:kimi] ✅ ${audience} (fallback)`);
      return {
        content:   stripCJK(msg.content || ""),
        toolCalls: msg.tool_calls,
      };
    }
    const errTxt = await res.text();
    throw new Error(`[AI:kimi] HTTP ${res.status}: ${errTxt.slice(0, 120)}`);
  }

  throw new Error(
    "No AI provider configured. Set OPENAI_API_KEY (bazaarlink.ai) or KIMI_API_KEY (Moonshot).",
  );
}

/** Quick helper — returns just the text string (most common use-case) */
export async function aiChat(
  messages: AIMessage[],
  options: AIOptions = {},
): Promise<string> {
  const result = await chatCompletion(messages, options);
  return result.content;
}

export function isAIConfigured(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.KIMI_API_KEY   ||
    process.env.MOONSHOT_API_KEY
  );
}
