/**
 * Storage Station (storagestation.app) Integration
 * WooCommerce REST API v3
 *
 * Orders are pushed ONLY after payment is confirmed.
 * Each order item is mapped using variantSku.
 */

import { calculateStorageStationRate, type StorageStationRate } from "@shared/storage-station-rates";

const SS_BASE_URL = "https://storagestation.app/wp-json/wc/v3";
const SS_KEY = process.env.STORAGE_STATION_API_KEY || "";
const SS_SECRET = process.env.STORAGE_STATION_API_SECRET || "";

export function isStorageStationConfigured(): boolean {
  return !!(SS_KEY && SS_SECRET);
}

// ─── Saudi city → WooCommerce state code ─────────────────────────────────────
const CITY_TO_STATE: Record<string, string> = {
  // Riyadh
  "الرياض": "SA-01", "الخرج": "SA-01", "الزلفي": "SA-01", "المجمعة": "SA-01",
  "عفيف": "SA-01", "الدوادمي": "SA-01", "الدرعية": "SA-01", "الحريق": "SA-01",
  "وادي الدواسر": "SA-01", "السليل": "SA-01", "ضرما": "SA-01",
  // Makkah
  "جدة": "SA-02", "مكة المكرمة": "SA-02", "الطائف": "SA-02", "القنفذة": "SA-02",
  "رابغ": "SA-02", "الجموم": "SA-02", "خليص": "SA-02", "الليث": "SA-02",
  // Madinah
  "المدينة المنورة": "SA-03", "ينبع": "SA-03", "العلا": "SA-03", "المهد": "SA-03",
  "بدر": "SA-03", "خيبر": "SA-03",
  // Eastern Province
  "الدمام": "SA-04", "الخبر": "SA-04", "الجبيل": "SA-04", "القطيف": "SA-04",
  "الأحساء": "SA-04", "الإحساء": "SA-04", "حفر الباطن": "SA-04", "رأس تنورة": "SA-04",
  "بقيق": "SA-04", "الخفجي": "SA-04", "عين دار": "SA-04",
  // Qassim
  "بريدة": "SA-05", "عنيزة": "SA-05", "الرس": "SA-05", "المذنب": "SA-05",
  "البكيرية": "SA-05", "الأسياح": "SA-05",
  // Hail
  "حائل": "SA-06", "بقعاء": "SA-06",
  // Tabuk
  "تبوك": "SA-07", "ضباء": "SA-07", "الوجه": "SA-07",
  // Northern Borders
  "عرعر": "SA-08", "رفحاء": "SA-08", "طريف": "SA-08",
  // Jizan
  "جيزان": "SA-09", "صبيا": "SA-09", "أبو عريش": "SA-09", "صامطة": "SA-09",
  // Najran
  "نجران": "SA-10", "شرورة": "SA-10",
  // Al Bahah
  "الباحة": "SA-11", "بلجرشي": "SA-11", "المخواة": "SA-11",
  // Al Jawf
  "سكاكا": "SA-12", "دومة الجندل": "SA-12", "القريات": "SA-12",
  // Asir
  "أبها": "SA-14", "خميس مشيط": "SA-14", "بيشة": "SA-14", "النماص": "SA-14",
  "محايل عسير": "SA-14", "أحد رفيدة": "SA-14",
};

// ─── Shipping zones cache (10 min TTL) ───────────────────────────────────────
interface ZoneCache {
  zones: Array<{
    id: number;
    name: string;
    locations: string[];
    methods: Array<{
      title: string;
      cost: number;
      enabled: boolean;
      methodId: string;
      requires?: string;
      minAmount?: number;
    }>;
  }>;
  expires: number;
}
let zoneCache: ZoneCache | null = null;
const productSkuCache = new Map<string, { productId: number; variationId?: number; expires: number }>();

async function fetchZoneData(): Promise<ZoneCache["zones"]> {
  if (zoneCache && Date.now() < zoneCache.expires) return zoneCache.zones;

  const rawZones: any[] = await ssRequest("GET", "/shipping/zones");
  const zones = (await Promise.all(
    rawZones.map(async (zone: any): Promise<ZoneCache["zones"][number] | null> => {
      if (zone.id === 0) return null; // skip "Locations not covered"
      try {
        const [locs, methods]: [any[], any[]] = await Promise.all([
          ssRequest("GET", `/shipping/zones/${zone.id}/locations`),
          ssRequest("GET", `/shipping/zones/${zone.id}/methods`),
        ]);

        const locationCodes = (locs || []).map((l: any) => l.code as string).filter(Boolean);
        const parsedMethods: ZoneCache["zones"][number]["methods"] = (methods || [])
          .filter((m: any) => m.enabled !== false)
          .flatMap((m: any) => {
            const methodId = String(m.method_id || "");
            const settings = m.settings || {};
            const rawCost = String(settings.cost?.value ?? "").trim();
            const parsedCost = /^-?\d+(?:\.\d+)?$/.test(rawCost) ? Number(rawCost) : null;
            const requires = String(settings.requires?.value || "");
            const minAmount = Number(settings.min_amount?.value || 0);

            // A free-shipping method is not necessarily available until its
            // minimum-order requirement is met. Do not confuse that minimum
            // with the shipping price.
            if (methodId === "free_shipping") {
              return [{
                title: m.method_title || m.title || "شحن مجاني",
                cost: 0,
                enabled: true,
                methodId,
                requires,
                minAmount: Number.isFinite(minAmount) ? minAmount : 0,
              }];
            }
            if (parsedCost === null || !Number.isFinite(parsedCost) || parsedCost < 0) return [];
            return [{
              title: m.method_title || m.title || "توصيل",
              cost: parsedCost,
              enabled: true,
              methodId,
            }];
          });

        return { id: zone.id, name: zone.name || "", locations: locationCodes, methods: parsedMethods };
      } catch {
        return null;
      }
    }),
  )).filter((zone): zone is ZoneCache["zones"][number] => zone !== null);

  zoneCache = { zones, expires: Date.now() + 10 * 60 * 1000 };
  return zones;
}

export type ShippingRateResult = StorageStationRate;

/**
 * Customer-facing Saudi delivery prices follow the current Storage Station
 * tariff supplied by the merchant. The carrier integration still uses its
 * separate APIs for coverage and shipment creation.
 */
export async function getShippingRateForCity(
  city: string,
  orderTotal = 0,
  freeShippingThreshold = 0,
  pieces = 1,
  cashOnDelivery = false,
): Promise<ShippingRateResult> {
  return calculateStorageStationRate({
    city,
    pieces,
    cashOnDelivery,
    orderTotal,
    freeShippingThreshold,
  });
}

/** Invalidate the zones cache (call after admin updates shipping settings) */
export function invalidateShippingZonesCache() {
  zoneCache = null;
}

function authHeaders(): Record<string, string> {
  const creds = Buffer.from(`${SS_KEY}:${SS_SECRET}`).toString("base64");
  return {
    "Authorization": `Basic ${creds}`,
    "Content-Type": "application/json",
  };
}

async function ssRequest(
  method: "GET" | "POST" | "PUT" | "PATCH",
  path: string,
  body?: Record<string, any>,
): Promise<any> {
  const url = `${SS_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.message || data?.code || text || res.statusText;
    throw new Error(`[StorageStation] HTTP ${res.status}: ${msg}`);
  }
  return data;
}

/** Confirm that the configured WooCommerce credentials can read the catalog. */
export async function testStorageStationConnection(): Promise<void> {
  if (!isStorageStationConfigured()) {
    throw new Error("[StorageStation] API credentials not configured");
  }
  const products = await ssRequest("GET", "/products?per_page=1");
  if (!Array.isArray(products)) {
    throw new Error("[StorageStation] Product catalog returned an unexpected response");
  }
}

interface WooCommerceProductReference {
  productId: number;
  variationId?: number;
}

function normalizedSku(value: unknown): string {
  return String(value || "").trim().toLocaleLowerCase();
}

function parentIdFromStoreApiVariation(variation: any): number | null {
  const directParentId = Number(variation.parent ?? variation.parent_id);
  if (Number.isInteger(directParentId) && directParentId > 0) return directParentId;

  const href = variation?._links?.up?.[0]?.href;
  if (typeof href !== "string") return null;
  const match = href.match(/\/products\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

async function findStoreApiVariation(sku: string): Promise<WooCommerceProductReference | null> {
  const url = `https://storagestation.app/wp-json/wc/store/v1/products?type=variation&sku=${encodeURIComponent(sku)}&per_page=100`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return null;

  const results = await response.json() as any[];
  if (!Array.isArray(results)) return null;
  const variation = results.find((product) => normalizedSku(product.sku) === normalizedSku(sku));
  if (!variation) return null;

  const productId = parentIdFromStoreApiVariation(variation);
  const variationId = Number(variation.id);
  if (!productId || !Number.isInteger(variationId) || variationId <= 0) return null;
  return { productId, variationId };
}

async function findVariationUnderProduct(parentId: number, sku: string): Promise<number | null> {
  for (let page = 1; page <= 20; page++) {
    const variations: any[] = await ssRequest(
      "GET",
      `/products/${parentId}/variations?per_page=100&page=${page}`,
    );
    if (!Array.isArray(variations)) return null;
    const match = variations.find((variation) => normalizedSku(variation.sku) === normalizedSku(sku));
    if (match && Number.isInteger(Number(match.id)) && Number(match.id) > 0) return Number(match.id);
    if (variations.length < 100) return null;
  }
  return null;
}

async function resolveWooCommerceProduct(skuValue: unknown, itemTitle: string): Promise<WooCommerceProductReference> {
  const sku = String(skuValue || "").trim();
  if (!sku) {
    throw new Error(`[StorageStation] Missing variant SKU for order item "${itemTitle}"`);
  }

  const normalized = normalizedSku(sku);
  const cached = productSkuCache.get(normalized);
  if (cached && Date.now() < cached.expires) {
    return { productId: cached.productId, variationId: cached.variationId };
  }

  const products: any[] = await ssRequest(
    "GET",
    `/products?sku=${encodeURIComponent(sku)}&per_page=100`,
  );
  const product = Array.isArray(products)
    ? products.find((candidate) => normalizedSku(candidate.sku) === normalized)
    : undefined;

  if (product && Number.isInteger(Number(product.id)) && Number(product.id) > 0) {
    if (product.type === "variable") {
      const variationId = await findVariationUnderProduct(Number(product.id), sku);
      if (variationId) {
        const result = { productId: Number(product.id), variationId };
        productSkuCache.set(normalized, { ...result, expires: Date.now() + 10 * 60 * 1000 });
        return result;
      }
    } else {
      const result = { productId: Number(product.id) };
      productSkuCache.set(normalized, { ...result, expires: Date.now() + 10 * 60 * 1000 });
      return result;
    }
  }

  const variation = await findStoreApiVariation(sku);
  if (variation) {
    productSkuCache.set(normalized, { ...variation, expires: Date.now() + 10 * 60 * 1000 });
    return variation;
  }

  throw new Error(`[StorageStation] SKU "${sku}" was not found as a purchasable product or variation`);
}

export interface StorageStationOrderResult {
  wcOrderId: number;
  wcOrderNumber: string;
  status: string;
}

/**
 * Build and push a paid order to Storage Station.
 * Only called for delivery orders after payment confirmation.
 */
export async function pushOrderToStorageStation(order: any): Promise<StorageStationOrderResult> {
  if (!isStorageStationConfigured()) {
    throw new Error("[StorageStation] API credentials not configured");
  }

  const orderRef = String(order.id || order._id).slice(-8).toUpperCase();

  // Map shipping address
  const addr = order.shippingAddress || {};
  const city = addr.city || "Riyadh";
  const street = [addr.street, addr.district].filter(Boolean).join("، ") || order.deliveryAddress || "";

  // Split customer name
  const fullName = (order.customerName || "عميل Myla").trim();
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || fullName;
  const lastName = nameParts.slice(1).join(" ") || "-";

  const phone = (order.customerPhone || "").replace(/\D/g, "");

  // WooCommerce requires product IDs (and a variation ID for variable items);
  // SKU is read-only on order line items.
  const lineItems = await Promise.all((order.items || []).map(async (item: any) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.price);
    if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`[StorageStation] Invalid quantity or price for order item "${item.title || "منتج"}"`);
    }

    const product = await resolveWooCommerceProduct(item.variantSku, item.title || "منتج");
    const lineTotal = (unitPrice * quantity).toFixed(2);
    return {
      product_id: product.productId,
      ...(product.variationId ? { variation_id: product.variationId } : {}),
      quantity,
      subtotal: lineTotal,
      total: lineTotal,
      meta_data: [
        { key: "sku", value: String(item.variantSku || "") },
        { key: "rf_order_id", value: orderRef },
      ],
    };
  }));

  const wcOrder = {
    status: "processing",
    currency: "SAR",
    billing: {
      first_name: firstName,
      last_name: lastName,
      phone,
      address_1: street,
      city,
      country: addr.country || "SA",
      email: "",
    },
    shipping: {
      first_name: firstName,
      last_name: lastName,
      phone,
      address_1: street,
      city,
      country: addr.country || "SA",
    },
    line_items: lineItems,
    shipping_lines: [
      {
        method_title: "شحن Myla",
        method_id: "flat_rate",
        total: String(Number(order.shippingCost || "0").toFixed(2)),
      },
    ],
    meta_data: [
      { key: "rf_order_id", value: String(order.id || order._id) },
      { key: "rf_order_ref", value: orderRef },
      { key: "rf_payment_method", value: order.paymentMethod || "" },
      { key: "rf_notes", value: order.notes || "" },
      { key: "source", value: "myla" },
    ],
    customer_note: order.notes || "",
    payment_method: "bacs",
    payment_method_title: "مدفوع مسبقاً",
    set_paid: true,
  };

  const result = await ssRequest("POST", "/orders", wcOrder);

  return {
    wcOrderId: result.id,
    wcOrderNumber: String(result.number || result.id),
    status: result.status || "processing",
  };
}

/**
 * Update the status of a WooCommerce order on Storage Station.
 */
export async function updateStorageStationOrder(
  wcOrderId: number,
  status: string,
): Promise<void> {
  await ssRequest("PUT", `/orders/${wcOrderId}`, { status });
}

/**
 * Get current status of a Storage Station order.
 */
export async function getStorageStationOrder(wcOrderId: number): Promise<any> {
  return ssRequest("GET", `/orders/${wcOrderId}`);
}
