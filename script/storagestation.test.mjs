import assert from "node:assert/strict";
import { after, test } from "node:test";

process.env.STORAGE_STATION_API_KEY = "test-consumer-key";
process.env.STORAGE_STATION_API_SECRET = "test-consumer-secret";

const originalFetch = globalThis.fetch;
const postedOrders = [];

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const sku = url.searchParams.get("sku");

  if (url.pathname.endsWith("/wc/v3/products") && sku === "SIMPLE-01") {
    return Response.json([{ id: 101, type: "simple", sku }]);
  }
  if (url.pathname.endsWith("/wc/v3/products") && sku === "VARIANT-02") {
    return Response.json([]);
  }
  if (url.pathname.endsWith("/wc/store/v1/products") && sku === "VARIANT-02") {
    return Response.json([{
      id: 303,
      sku,
      _links: { up: [{ href: "https://storagestation.app/wp-json/wc/store/v1/products/202" }] },
    }]);
  }
  if (url.pathname.endsWith("/wc/v3/products") && url.searchParams.get("per_page") === "1") {
    return Response.json([]);
  }
  if (url.pathname.endsWith("/wc/v3/shipping/zones")) {
    return Response.json([{ id: 5, name: "منطقة الرياض" }, { id: 0, name: "باقي المناطق" }]);
  }
  if (url.pathname.endsWith("/wc/v3/shipping/zones/5/locations")) {
    return Response.json([{ code: "SA-01" }]);
  }
  if (url.pathname.endsWith("/wc/v3/shipping/zones/5/methods")) {
    return Response.json([
      {
        method_id: "free_shipping",
        method_title: "شحن مجاني",
        enabled: true,
        settings: {
          requires: { value: "min_amount" },
          min_amount: { value: "200" },
        },
      },
      {
        method_id: "flat_rate",
        method_title: "توصيل عادي",
        enabled: true,
        settings: { cost: { value: "17.50" } },
      },
    ]);
  }
  if (url.pathname.endsWith("/wc/v3/orders") && init.method === "POST") {
    postedOrders.push(JSON.parse(String(init.body)));
    return Response.json({ id: 9001, number: "9001", status: "processing" });
  }
  throw new Error(`Unexpected mocked request: ${init.method || "GET"} ${url}`);
};

const {
  getShippingRateForCity,
  invalidateShippingZonesCache,
  pushOrderToStorageStation,
  testStorageStationConnection,
} = await import("../server/storagestation.ts");

after(() => {
  globalThis.fetch = originalFetch;
});

test("maps simple product and variant SKU to WooCommerce IDs", async () => {
  const result = await pushOrderToStorageStation({
    id: "order-test-12345678",
    customerName: "Test Customer",
    customerPhone: "+966500000000",
    shippingAddress: { city: "الرياض", street: "Test Street", country: "SA" },
    items: [
      { title: "Simple item", variantSku: "SIMPLE-01", quantity: 2, price: 25 },
      { title: "Variant item", variantSku: "VARIANT-02", quantity: 1, price: 40 },
    ],
  });

  assert.deepEqual(result, { wcOrderId: 9001, wcOrderNumber: "9001", status: "processing" });
  assert.equal(postedOrders.length, 1);
  assert.deepEqual(postedOrders[0].line_items.map(({ product_id, variation_id, quantity, total, sku }) => ({
    product_id,
    variation_id,
    quantity,
    total,
    sku,
  })), [
    { product_id: 101, variation_id: undefined, quantity: 2, total: "50.00", sku: undefined },
    { product_id: 202, variation_id: 303, quantity: 1, total: "40.00", sku: undefined },
  ]);
});

test("uses the configured zone rate and does not treat minimum order value as shipping cost", async () => {
  invalidateShippingZonesCache();
  const rate = await getShippingRateForCity("الرياض", 100, 0, 30);
  assert.deepEqual(rate, {
    cost: 17.5,
    zoneName: "منطقة الرياض",
    methodTitle: "توصيل عادي",
    isFree: false,
  });
});

test("checks Storage Station product-catalog access", async () => {
  await testStorageStationConnection();
});