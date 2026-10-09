import { randomUUID } from "crypto";

const API_BASE_URL = (process.env.QIROX_API_BASE_URL || "https://qiroxstudio.online/api/v1").replace(/\/+$/, "");
const PROJECT_ID = process.env.QIROX_PROJECT_ID || "6a32cae9ebc072988ce4eb42";

type QiroxChannel = "email" | "whatsapp";

export function isQiroxConfigured(channel: QiroxChannel): boolean {
  return Boolean(
    channel === "email"
      ? process.env.QIROX_EMAIL_API_KEY
      : process.env.QIROX_WHATSAPP_API_KEY,
  );
}

async function postToQirox(
  channel: QiroxChannel,
  payload: Record<string, unknown>,
): Promise<void> {
  const key = channel === "email"
    ? process.env.QIROX_EMAIL_API_KEY
    : process.env.QIROX_WHATSAPP_API_KEY;

  if (!key) {
    throw new Error(`QIROX ${channel} API key is not configured`);
  }

  const response = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(PROJECT_ID)}/${channel}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${channel}-${randomUUID()}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    // Do not log the response body or request headers; provider errors may echo
    // customer data or authentication details.
    throw new Error(`QIROX ${channel} request failed with HTTP ${response.status}`);
  }
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\s*br\s*\/?>|<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function sendQiroxEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  message: string;
}): Promise<void> {
  if (params.subject.length > 200) {
    throw new Error("QIROX email subject must not exceed 200 characters");
  }
  if (params.message.length > 100_000) {
    throw new Error("QIROX email message must not exceed 100000 characters");
  }

  await postToQirox("email", {
    recipient: {
      email: params.to,
      ...(params.toName ? { name: params.toName } : {}),
    },
    subject: params.subject,
    message: params.message,
  });
}

export function emailBodyAsText(html: string, text?: string): string {
  return text?.trim() || htmlToPlainText(html);
}

export async function sendQiroxWhatsAppOtp(phone: string, otp: string): Promise<void> {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  const internationalPhone = digits.startsWith("966") ? `+${digits}` : `+966${digits}`;

  await postToQirox("whatsapp", {
    recipient: {
      phone: internationalPhone,
      name: "عميل Myla",
    },
    platformName: "Myla",
    clientName: "Myla",
    code: otp,
    message: `رمز التحقق الخاص بك في Myla هو ${otp}. صالح لمدة 10 دقائق. لا تشاركه مع أحد.`,
  });
}