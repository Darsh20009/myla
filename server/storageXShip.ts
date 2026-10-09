/**
 * Storage X Ship partner API (3rd Mile).
 * The bearer key is read at request time and is never returned to callers.
 */

const DEFAULT_BASE_URL = "https://shipping.3rdmile.net/api/public/partner/v1";
const REQUEST_TIMEOUT_MS = 20_000;

export class StorageXShipApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "StorageXShipApiError";
  }
}

export interface StorageXPickup {
  name?: string;
  phone: string;
  addressLine: string;
  nationalAddress: string;
  city: string;
  district?: string;
}

export interface StorageXRecipient {
  name: string;
  phone: string;
  addressLine: string;
  nationalAddress: string;
  city: string;
  district?: string;
}

export interface StorageXQuoteInput {
  recipientCity: string;
  pickupCity?: string;
  merchantRef?: string;
  weightGrams: number;
  codAmount?: number;
  codMethod?: "cash" | "pos";
  serviceType?: string;
}

export interface StorageXShipmentInput {
  externalOrderId: string;
  merchantRef?: string;
  recipient: StorageXRecipient;
  pickup: StorageXPickup;
  weightGrams: number;
  pieces?: number;
  description?: string;
  codAmount?: number;
  codMethod?: "cash" | "pos";
  serviceType?: string;
}

export interface StorageXShipmentResult {
  shipmentId: string;
  trackingNumber: string;
  status: string;
  duplicate: boolean;
}

function getBaseUrl(): string {
  return (process.env.STORAGE_X_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function isStorageXShipConfigured(): boolean {
  return Boolean(process.env.STORAGE_X_API_KEY?.trim());
}

export function normalizeStorageXNationalAddress(value: unknown): string {
  return String(value || "").replace(/\s+/g, "").toUpperCase();
}

export function isValidStorageXNationalAddress(value: unknown): boolean {
  return /^[A-Z]{4}\d{4}$/.test(normalizeStorageXNationalAddress(value));
}

export function normalizeStorageXMerchantRef(value: unknown): string {
  const merchantRef = String(value || "").trim().toUpperCase();
  if (!merchantRef) return "";
  if (!/^SXH-[A-Z0-9]{10}$/.test(merchantRef)) {
    throw new Error("[StorageX] merchantRef must use the SXH- merchant handoff-code format");
  }
  return merchantRef;
}

export function isValidStorageXMerchantRef(value: unknown): boolean {
  if (!String(value || "").trim()) return false;
  try {
    normalizeStorageXMerchantRef(value);
    return true;
  } catch {
    return false;
  }
}

export function normalizeStorageXPhone(value: unknown): string {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00966")) digits = digits.slice(5);
  else if (digits.startsWith("966")) digits = digits.slice(3);
  if (/^5\d{8}$/.test(digits)) digits = `0${digits}`;
  if (!/^05\d{8}$/.test(digits)) {
    throw new Error("[StorageX] phone must be a Saudi mobile number in 05XXXXXXXX format");
  }
  return digits;
}

export function isValidStorageXPhone(value: unknown): boolean {
  try {
    normalizeStorageXPhone(value);
    return true;
  } catch {
    return false;
  }
}

function requireText(value: unknown, label: string): string {
  const result = String(value || "").trim();
  if (!result) throw new Error(`[StorageX] ${label} is required`);
  return result;
}

function requireWeight(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("[StorageX] package.weightGrams must be greater than zero");
  }
  return Math.round(value);
}

function buildCod(amount?: number, method: "cash" | "pos" = "cash") {
  if (amount === undefined) return undefined;
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("[StorageX] COD amount must be a non-negative finite SAR amount");
  }
  if (amount === 0) return undefined;
  return { amount, method };
}

async function storageXRequest<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.STORAGE_X_API_KEY?.trim();
  if (!apiKey) throw new Error("[StorageX] STORAGE_X_API_KEY is not configured");

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error: any) {
    throw new Error(`[StorageX] request failed: ${error?.name === "TimeoutError" ? "timeout" : "network error"}`);
  }

  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const code = String(data?.error || "request_failed").slice(0, 80);
    const message = String(data?.message || `${method} request failed`).slice(0, 240);
    throw new StorageXShipApiError(message, response.status, code);
  }
  return data as T;
}

export async function getStorageXStatuses(): Promise<any> {
  return storageXRequest("GET", "/statuses");
}

export async function getStorageXCoverage(city?: string): Promise<any> {
  const query = city?.trim() ? `?city=${encodeURIComponent(city.trim())}` : "";
  return storageXRequest("GET", `/coverage${query}`);
}

export async function quoteStorageX(input: StorageXQuoteInput): Promise<any> {
  const recipientCity = requireText(input.recipientCity, "recipient.city");
  const weightGrams = requireWeight(input.weightGrams);
  const merchantRef = normalizeStorageXMerchantRef(input.merchantRef);
  const body: Record<string, unknown> = {
    recipient: { city: recipientCity },
    package: { weightGrams },
  };
  if (merchantRef) body.merchantRef = merchantRef;
  if (input.pickupCity?.trim()) body.pickup = { city: input.pickupCity.trim() };
  const cod = buildCod(input.codAmount, input.codMethod);
  if (cod) body.cod = cod;
  if (input.serviceType?.trim()) body.serviceType = input.serviceType.trim();

  const result = await storageXRequest<any>("POST", "/quote", body);
  if (result?.serviceable === true && !/^\d+$/.test(String(result.totalMinor ?? ""))) {
    throw new Error("[StorageX] quote response is missing a valid totalMinor");
  }
  return result;
}

export async function createStorageXShipment(input: StorageXShipmentInput): Promise<StorageXShipmentResult> {
  const externalOrderId = requireText(input.externalOrderId, "externalOrderId");
  const weightGrams = requireWeight(input.weightGrams);
  const merchantRef = normalizeStorageXMerchantRef(input.merchantRef);
  const recipientNationalAddress = normalizeStorageXNationalAddress(input.recipient.nationalAddress);
  const pickupNationalAddress = normalizeStorageXNationalAddress(input.pickup.nationalAddress);

  if (!isValidStorageXNationalAddress(recipientNationalAddress)) {
    throw new Error("[StorageX] recipient.nationalAddress must be four letters followed by four digits");
  }
  if (!isValidStorageXNationalAddress(pickupNationalAddress)) {
    throw new Error("[StorageX] pickup.nationalAddress must be four letters followed by four digits");
  }
  if (input.pieces !== undefined && (!Number.isInteger(input.pieces) || input.pieces < 1 || input.pieces > 50)) {
    throw new Error("[StorageX] package.pieces must be a whole number from 1 to 50");
  }

  const body: Record<string, unknown> = {
    externalOrderId,
    ...(merchantRef ? { merchantRef } : {}),
    recipient: {
      name: requireText(input.recipient.name, "recipient.name"),
      phone: normalizeStorageXPhone(requireText(input.recipient.phone, "recipient.phone")),
      addressLine: requireText(input.recipient.addressLine, "recipient.addressLine"),
      nationalAddress: recipientNationalAddress,
      city: requireText(input.recipient.city, "recipient.city"),
      ...(input.recipient.district?.trim() ? { district: input.recipient.district.trim() } : {}),
    },
    pickup: {
      ...(input.pickup.name?.trim() ? { name: input.pickup.name.trim() } : {}),
      phone: normalizeStorageXPhone(requireText(input.pickup.phone, "pickup.phone")),
      addressLine: requireText(input.pickup.addressLine, "pickup.addressLine"),
      nationalAddress: pickupNationalAddress,
      city: requireText(input.pickup.city, "pickup.city"),
      ...(input.pickup.district?.trim() ? { district: input.pickup.district.trim() } : {}),
    },
    package: {
      weightGrams,
      ...(input.pieces !== undefined ? { pieces: input.pieces } : {}),
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    },
  };
  const cod = buildCod(input.codAmount, input.codMethod);
  if (cod) body.cod = cod;
  if (input.serviceType?.trim()) body.serviceType = input.serviceType.trim();

  const result = await storageXRequest<any>("POST", "/shipments", body);
  if (!result?.trackingNumber) throw new Error("[StorageX] create response is missing trackingNumber");
  return {
    shipmentId: String(result.shipmentId || ""),
    trackingNumber: String(result.trackingNumber),
    status: String(result.status || "created"),
    duplicate: result.duplicate === true,
  };
}

export async function trackStorageXShipment(trackingNumber: string): Promise<any> {
  return storageXRequest("GET", `/shipments/${encodeURIComponent(requireText(trackingNumber, "trackingNumber"))}`);
}

export async function updateStorageXShipment(trackingNumber: string, changes: Record<string, unknown>): Promise<any> {
  const payload = { ...changes };
  if ("nationalAddress" in payload) {
    const normalized = normalizeStorageXNationalAddress(payload.nationalAddress);
    if (!isValidStorageXNationalAddress(normalized)) {
      throw new Error("[StorageX] nationalAddress must be four letters followed by four digits");
    }
    payload.nationalAddress = normalized;
  }
  if ("weightGrams" in payload &&
      (!Number.isInteger(Number(payload.weightGrams)) || Number(payload.weightGrams) <= 0)) {
    throw new Error("[StorageX] weightGrams must be a positive whole number");
  }
  if ("codAmount" in payload &&
      (!Number.isFinite(Number(payload.codAmount)) || Number(payload.codAmount) < 0)) {
    throw new Error("[StorageX] codAmount must be a non-negative SAR amount");
  }
  if ("codMethod" in payload && !["cash", "pos"].includes(String(payload.codMethod))) {
    throw new Error("[StorageX] codMethod must be cash or pos");
  }
  if (!Object.keys(payload).some((key) => key !== "reason" && key !== "trackingNumber")) {
    throw new Error("[StorageX] update requires at least one shipment field");
  }
  delete payload.trackingNumber;
  return storageXRequest("PATCH", `/shipments/${encodeURIComponent(requireText(trackingNumber, "trackingNumber"))}`, payload);
}

export async function cancelStorageXShipment(trackingNumber: string, reason?: string): Promise<any> {
  const body = reason?.trim() ? { reason: reason.trim().slice(0, 500) } : {};
  return storageXRequest("POST", `/shipments/${encodeURIComponent(requireText(trackingNumber, "trackingNumber"))}/cancel`, body);
}

export async function getStorageXLabelUrl(trackingNumber: string): Promise<string> {
  const result = await storageXRequest<any>(
    "GET",
    `/shipments/${encodeURIComponent(requireText(trackingNumber, "trackingNumber"))}/label?format=url`,
  );
  if (typeof result?.url !== "string" || !/^https:\/\//i.test(result.url)) {
    throw new Error("[StorageX] label response did not include a valid HTTPS URL");
  }
  return result.url;
}