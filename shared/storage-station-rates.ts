export const STORAGE_STATION_ITEM_WEIGHT_GRAMS = 1000;

export const STORAGE_STATION_DOMESTIC_TARIFF = {
  priorityCityPrice: 14,
  otherCityPrice: 18,
  includedWeightGrams: 15_000,
  extraPerKilogram: 1,
  cashOnDeliveryFee: 5,
} as const;

const PRIORITY_CITIES = new Set([
  "الرياض", "riyadh",
  "الدمام", "dammam",
  "الخبر", "khobar", "alkhobar",
  "سيهات", "sayhat", "saihat",
  "القطيف", "qatif",
  "الظهران", "dhahran",
  "تاروت", "tarout", "tarut",
]);

function normalizeCity(city: string): string {
  return String(city || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[\s._-]+/g, "");
}

export function getShippingPieceCount(
  items: ReadonlyArray<{ quantity?: number | string | null }>,
): number {
  const count = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    return Number.isSafeInteger(quantity) && quantity > 0 ? sum + quantity : sum;
  }, 0);
  return Math.max(1, count);
}

export function getShippingWeightGrams(pieces: number): number {
  const safePieces = Number.isSafeInteger(pieces) && pieces > 0 ? pieces : 1;
  return safePieces * STORAGE_STATION_ITEM_WEIGHT_GRAMS;
}

export interface StorageStationRateInput {
  city: string;
  pieces: number;
  cashOnDelivery?: boolean;
  orderTotal?: number;
  freeShippingThreshold?: number;
  freeShippingEnabled?: boolean;
}

export interface StorageStationRate {
  cost: number;
  baseCost: number;
  extraWeightCost: number;
  codFee: number;
  pieces: number;
  weightGrams: number;
  zoneName: string;
  methodTitle: string;
  isFree: boolean;
}

export function calculateStorageStationRate(
  input: StorageStationRateInput,
): StorageStationRate {
  const cityKey = normalizeCity(input.city);
  const priorityCity = PRIORITY_CITIES.has(cityKey);
  const pieces = Number.isSafeInteger(input.pieces) && input.pieces > 0
    ? input.pieces
    : 1;
  const weightGrams = getShippingWeightGrams(pieces);
  const baseCost = priorityCity
    ? STORAGE_STATION_DOMESTIC_TARIFF.priorityCityPrice
    : STORAGE_STATION_DOMESTIC_TARIFF.otherCityPrice;
  const extraWeightKg = Math.ceil(
    Math.max(0, weightGrams - STORAGE_STATION_DOMESTIC_TARIFF.includedWeightGrams) / 1000,
  );
  const extraWeightCost = extraWeightKg * STORAGE_STATION_DOMESTIC_TARIFF.extraPerKilogram;
  const codFee = input.cashOnDelivery
    ? STORAGE_STATION_DOMESTIC_TARIFF.cashOnDeliveryFee
    : 0;
  const threshold = Number(input.freeShippingThreshold) || 0;
  const freeShipping = input.freeShippingEnabled !== false &&
    threshold > 0 &&
    Number(input.orderTotal) >= threshold;
  const cost = (freeShipping ? 0 : baseCost + extraWeightCost) + codFee;

  return {
    cost,
    baseCost,
    extraWeightCost,
    codFee,
    pieces,
    weightGrams,
    zoneName: freeShipping
      ? (codFee ? "شحن مجاني مع رسوم الدفع عند الاستلام" : "شحن مجاني")
      : priorityCity
        ? "الرياض والدمام والخبر وسيهات والقطيف والظهران وتاروت"
        : "بقية مدن المملكة",
    methodTitle: "توصيل Storage Station",
    isFree: cost === 0,
  };
}
