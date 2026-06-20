/**
 * POS Engine — Professional Restaurant POS Business Logic
 * ════════════════════════════════════════════════════════
 * Pure TypeScript — no React, no side effects.
 * All state types and calculation functions for the POS system.
 */

export type OrderType    = "dine_in" | "takeaway" | "delivery" | "car_pickup";
export type PaymentMethod = "cash" | "card" | "myla-card" | "split";

export interface LineItemDiscount {
  type:  'percent' | 'amount';
  value: number;
}

export interface OrderDiscount {
  type:  'percent' | 'amount';
  value: number;
  reason?: string;
}

export interface ServiceCharge {
  enabled: boolean;
  type:    'percent' | 'fixed';
  value:   number;
}

export interface PersonPayment {
  id: string;
  method: 'cash' | 'card' | 'mixed';
  amount: string;
  cashAmount?: string;
  cardAmount?: string;
}

export interface CartSnapshot {
  id:            string;
  name:          string;
  orderItems:    any[];
  orderType:     OrderType;
  tableNumber:   string;
  customerName:  string;
  customerPhone: string;
  orderNote:     string;
  paymentMethod: PaymentMethod;
  splitCashAmount: string;
  personPayments: PersonPayment[];
  itemDiscounts: Record<string, LineItemDiscount>;
  orderDiscount?: OrderDiscount;
  serviceCharge?: ServiceCharge;
  createdAt:     number;
}

export interface HeldCart extends CartSnapshot {
  heldAt:      number;
  totalAmount: number;
}

export interface CartTab {
  id:        string;
  name:      string;
  itemCount: number;
  total:     number;
  createdAt: number;
}

export interface POSTotals {
  rawTotal:         number;
  subtotal:         number;
  tax:              number;
  itemDiscountAmt:  number;
  pointsDiscount:   number;
  couponDiscount:   number;
  orderDiscountAmt: number;
  serviceChargeAmt: number;
  grandTotal:       number;
  change:           number;
}

export const VAT_RATE = 0.15;

export function computeUnitPrice(item: any): number {
  let base = Number(item.coffeeItem?.price) || 0;
  if (item.selectedSize && item.coffeeItem?.availableSizes) {
    const size = item.coffeeItem.availableSizes.find((s: any) => s.nameAr === item.selectedSize);
    if (size) base = Number(size.price) || 0;
  }
  const addons = (item.customization?.selectedItemAddons || [])
    .reduce((s: number, a: any) => s + (Number(a.price) || 0), 0);
  return base + addons;
}

export function computeItemDiscountAmount(unitPrice: number, qty: number, discount?: LineItemDiscount): number {
  if (!discount) return 0;
  const lineTotal = unitPrice * qty;
  if (discount.type === 'percent') return Math.min(lineTotal, lineTotal * discount.value / 100);
  return Math.min(lineTotal, discount.value);
}

export function computeTotalItemDiscounts(items: any[], discounts: Record<string, LineItemDiscount>): number {
  return items.reduce((sum, item) => {
    const d = discounts[item.lineItemId];
    return sum + computeItemDiscountAmount(computeUnitPrice(item), item.quantity, d);
  }, 0);
}

export function computeServiceChargeAmount(base: number, config?: ServiceCharge): number {
  if (!config?.enabled) return 0;
  if (config.type === 'fixed')   return Math.max(0, config.value);
  if (config.type === 'percent') return Math.max(0, base * config.value / 100);
  return 0;
}

export function computeOrderDiscountAmount(base: number, discount?: OrderDiscount): number {
  if (!discount) return 0;
  if (discount.type === 'amount')  return Math.min(base, Math.max(0, discount.value));
  if (discount.type === 'percent') return Math.min(base, base * Math.max(0, discount.value) / 100);
  return 0;
}

export function computePOSTotals(
  items:          any[],
  itemDiscounts:  Record<string, LineItemDiscount>,
  pointsDiscount: number,
  couponDiscount: number,
  orderDiscount?: OrderDiscount,
  serviceCharge?: ServiceCharge,
): POSTotals {
  const rawTotal = items.reduce((s, item) => s + computeUnitPrice(item) * item.quantity, 0);
  const itemDiscountAmt = computeTotalItemDiscounts(items, itemDiscounts);
  const afterItemDiscounts = Math.max(0, rawTotal - itemDiscountAmt);
  const afterPoints = Math.max(0, afterItemDiscounts - pointsDiscount);
  const afterCoupon = Math.max(0, afterPoints - couponDiscount);
  const orderDiscountAmt = computeOrderDiscountAmount(afterCoupon, orderDiscount);
  const afterOrderDiscount = Math.max(0, afterCoupon - orderDiscountAmt);
  const serviceChargeAmt = computeServiceChargeAmount(afterOrderDiscount, serviceCharge);
  const grandTotal = Math.max(0, afterOrderDiscount + serviceChargeAmt);
  const subtotal = grandTotal / (1 + VAT_RATE);
  const tax      = grandTotal - subtotal;

  return {
    rawTotal, subtotal, tax,
    itemDiscountAmt, pointsDiscount, couponDiscount,
    orderDiscountAmt, serviceChargeAmt, grandTotal, change: 0,
  };
}

export function newCartId(): string {
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function newLineId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function blankCart(id: string, name: string): CartSnapshot {
  return {
    id, name,
    orderItems:      [],
    orderType:       'dine_in',
    tableNumber:     '',
    customerName:    '',
    customerPhone:   '',
    orderNote:       '',
    paymentMethod:   'cash',
    splitCashAmount: '',
    personPayments: [{ id: '1', method: 'cash' as const, amount: '' }],
    itemDiscounts:   {},
    createdAt:       Date.now(),
  };
}

export function mergeCartItems(base: any[], incoming: any[]): any[] {
  const result = [...base];
  for (const inc of incoming) {
    const addonKey = JSON.stringify(inc.customization?.selectedItemAddons || []);
    const sizeKey  = inc.selectedSize || '';
    const existing = result.find(b =>
      b.coffeeItem.id === inc.coffeeItem.id &&
      (b.selectedSize || '') === sizeKey &&
      JSON.stringify(b.customization?.selectedItemAddons || []) === addonKey
    );
    if (existing) {
      existing.quantity += inc.quantity;
    } else {
      result.push({ ...inc, lineItemId: newLineId() });
    }
  }
  return result;
}

export function splitCartByPersons(items: any[], persons: number): any[][] {
  if (persons <= 1) return [items];
  const result: any[][] = Array.from({ length: persons }, () => []);
  items.forEach((item, i) => { result[i % persons].push(item); });
  return result;
}

export function computePersonShares(total: number, persons: number): number[] {
  if (persons <= 1) return [total];
  const share = Math.floor((total / persons) * 100) / 100;
  const shares = Array(persons).fill(share);
  shares[persons - 1] = Math.round((total - share * (persons - 1)) * 100) / 100;
  return shares;
}
