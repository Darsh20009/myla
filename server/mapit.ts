/**
 * Mapit shipping integration.
 *
 * Mapit uses a merchant API token from the dashboard:
 *   Authorization: Bearer {Token}
 *
 * API documentation: https://www.mapit.sa/documentation
 */

const MAPIT_BASE_URL = (process.env.MAPIT_BASE_URL || "https://backend.mapit.sa").replace(/\/+$/, "");
const MAPIT_API_TOKEN = (process.env.MAPIT_API_TOKEN || "").trim();
const MAPIT_WAREHOUSE = (process.env.MAPIT_WAREHOUSE || "").trim();
const MAPIT_PICKUP_POINT = (process.env.MAPIT_PICKUP_POINT || "").trim();
const DEFAULT_WEIGHT = Number(process.env.MAPIT_DEFAULT_WEIGHT || "0.5");

export const MAPIT_TRACKING_BASE_URL = "https://www.mapit.sa/customer/track";

export const MAPIT_STATUSES = [
  "ORDER_PENDING",
  "ORDER_ASSIGNED_TO_SHIPPING_COMPANY",
  "ORDER_ASSIGNED_TO_DRIVER_FOR_PICK_UP",
  "ORDER_PICKED_UP_FROM_MERCHANT",
  "ORDER_IN_SHIPPING_COMPANY",
  "ORDER_ASSIGNED_TO_DRIVER_FOR_DROP_OFF",
  "ORDER_PICKED_UP_FOR_DROP_OFF",
  "ORDER_STARTED",
  "ORDER_ON_HOLD",
  "ORDER_COMPLETED",
  "ORDER_FAILED_TO_PICK_UP",
  "ORDER_FAILED_TO_DROP_OFF",
  "ORDER_ASSIGNED_TO_DRIVER_FOR_TRANSFER",
  "ORDER_PICKED_UP_FOR_TRANSFER",
  "ORDER_RETURN",
  "ORDER_ASSIGNED_TO_DRIVER_FOR_RETURN",
  "ORDER_PICKED_UP_FOR_RETURN",
] as const;

export type MapitStatus = (typeof MAPIT_STATUSES)[number] | string;

export interface MapitOrderResult {
  orderNumber: string;
  status: MapitStatus;
  trackingUrl: string;
  raw: any;
}

export function isMapitConfigured(): boolean {
  return MAPIT_API_TOKEN.length > 0;
}

function unwrap(data: any): any {
  if (data && typeof data === "object") {
    if (data.body !== undefined) return data.body;
    if (data.data !== undefined) return data.data;
  }
  return data;
}

function getOrderNumber(data: any): string {
  const value = unwrap(data);
  const candidate =
    value?.orderNumber ??
    value?.order_number ??
    value?.number ??
    value?.id ??
    data?.orderNumber ??
    data?.order_number ??
    data?.id;
  return candidate === undefined || candidate === null ? "" : String(candidate);
}

async function mapitRequest(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: any): Promise<any> {
  if (!isMapitConfigured()) {
    throw new Error("[Mapit] MAPIT_API_TOKEN is not configured");
  }

  const response = await fetch(`${MAPIT_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${MAPIT_API_TOKEN}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data?.message || data?.error || data?.body?.message || text || response.statusText;
    throw new Error(`[Mapit] HTTP ${response.status}: ${message}`);
  }

  if (data?.success === false) {
    throw new Error(`[Mapit] ${data.message || "The API rejected the request"}`);
  }
  return data;
}

function normalizeSaudiPhone(value: unknown): { phoneCode: string; phone: string } {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("966")) return { phoneCode: "+966", phone: digits.slice(3).replace(/^0/, "") };
  if (digits.startsWith("0")) digits = digits.slice(1);
  return { phoneCode: "+966", phone: digits };
}

function addressForMapit(order: any): { address: any; coordinates: [number, number] } {
  const source = order.shippingAddress || {};
  const latitude = Number(order.latitude);
  const longitude = Number(order.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("[Mapit] Customer map coordinates are required before creating a shipment");
  }

  return {
    address: {
      city: source.city || "الرياض",
      area: source.district || "",
      street: source.street || order.deliveryAddress || "",
      houseNumber: source.building || "",
      floor: source.floor || "",
      flat: source.apartment || "",
      landmark: source.notes || order.notes || "",
    },
    coordinates: [longitude, latitude],
  };
}

export function mapitTrackingUrl(orderNumber: string): string {
  return orderNumber ? `${MAPIT_TRACKING_BASE_URL}/${encodeURIComponent(orderNumber)}` : "";
}

export interface MapitPickupSettings {
  warehouseId?: string;
  pickupPointId?: string;
}

export async function createMapitOrder(order: any, pickup?: MapitPickupSettings): Promise<MapitOrderResult> {
  if (!isMapitConfigured()) throw new Error("[Mapit] MAPIT_API_TOKEN is not configured");

  const { address, coordinates } = addressForMapit(order);
  const { phoneCode, phone } = normalizeSaudiPhone(order.customerPhone);
  if (!phone) throw new Error("[Mapit] Customer phone is required");

  const packagesCount =
    (order.items || []).reduce((total: number, item: any) => total + Math.max(1, Number(item.quantity) || 1), 0) || 1;
  const orderNumber = String(order.id || order._id || "").slice(-8).toUpperCase();
  const isCod = String(order.paymentMethod || "").toLowerCase() === "cod";

  const payload: Record<string, any> = {
    packagesCount,
    weight: Number.isFinite(DEFAULT_WEIGHT) && DEFAULT_WEIGHT > 0 ? DEFAULT_WEIGHT : 0.5,
    amountPayable: isCod ? Number(order.total) || 0 : 0,
    merchantOrderNumber: orderNumber,
    user: {
      name: String(order.customerName || "عميل Myla").trim(),
      phoneCode,
      phone,
      address,
      location: { coordinates },
      ...(order.customerEmail ? { email: order.customerEmail } : {}),
    },
    orderItems: (order.items || []).map((item: any) => ({
      item: String(item.title || "منتج"),
      amount: Number(item.price) || 0,
    })),
  };

  // pickup settings: DB values override env vars
  const warehouseId = pickup?.warehouseId || MAPIT_WAREHOUSE;
  const pickupPointId = pickup?.pickupPointId || MAPIT_PICKUP_POINT;
  if (warehouseId) payload.warehouse = warehouseId;
  if (pickupPointId) payload.pickupPoint = pickupPointId;

  const raw = await mapitRequest("POST", "/api/v1/order/integration", payload);
  const mapitOrderNumber = getOrderNumber(raw);
  if (!mapitOrderNumber) {
    throw new Error("[Mapit] Create order response did not include an order number");
  }

  const value = unwrap(raw);
  const status = String(value?.currentStatus || value?.status || "ORDER_PENDING");
  return {
    orderNumber: mapitOrderNumber,
    status,
    trackingUrl: mapitTrackingUrl(mapitOrderNumber),
    raw,
  };
}

export async function getMapitOrder(orderNumber: string): Promise<any> {
  if (!orderNumber) throw new Error("[Mapit] Order number is required");
  return unwrap(await mapitRequest("GET", `/api/v1/order/integration/${encodeURIComponent(orderNumber)}`));
}

export async function listMapitOrders(params: {
  page?: number;
  limit?: number;
  searchKey?: string;
  currentStatus?: string;
} = {}): Promise<any> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.searchKey) query.set("searchKey", params.searchKey);
  if (params.currentStatus) query.set("currentStatus", params.currentStatus);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return unwrap(await mapitRequest("GET", `/api/v1/order/integration${suffix}`));
}

export async function updateMapitOrder(orderNumber: string, payload: Record<string, any>): Promise<any> {
  return unwrap(await mapitRequest("PUT", `/api/v1/order/integration/${encodeURIComponent(orderNumber)}`, payload));
}

export async function deleteMapitOrder(orderNumber: string): Promise<void> {
  await mapitRequest("DELETE", `/api/v1/order/integration/${encodeURIComponent(orderNumber)}`);
}