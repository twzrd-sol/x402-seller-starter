import { describe, expect, it } from "vitest";
import app from "../src/index.js";
import { json } from "./json.js";

// These tests call the live TWZRD facilitator (https://intel.twzrd.xyz) to
// build the x402 challenge - matching the same convention already
// established and CI-verified in the sibling x402-solana-starter repo
// (test/paid-route.test.ts there does the same). x402-hono's
// paymentMiddleware needs a real /supported response to construct a
// correctly-priced challenge with a real feePayer; mocking that out would
// mean testing our own assumptions about the facilitator's shape instead
// of the actual live contract this template ships against.

const VALID_PAY_TO = "GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function env(overrides: Partial<Record<"PAY_TO" | "PRICE" | "FACILITATOR_URL" | "NETWORK", string>> = {}) {
  return {
    PAY_TO: VALID_PAY_TO,
    PRICE: "$0.05",
    FACILITATOR_URL: "https://intel.twzrd.xyz",
    NETWORK: "solana",
    ...overrides,
  };
}

describe("GET /paid/hello, unconfigured PAY_TO", () => {
  it("500s with pay_to_not_configured before ever reaching the facilitator", async () => {
    const res = await app.request("/paid/hello", {}, env({ PAY_TO: "" }));
    expect(res.status).toBe(500);
    expect((await json(res)).error).toBe("pay_to_not_configured");
  });
});

describe("GET /paid/hello, configured PAY_TO, no payment", () => {
  it(
    "returns a 402 challenge priced for the configured wallet, from the live TWZRD facilitator",
    { timeout: 20_000 },
    async () => {
      const res = await app.request("/paid/hello", {}, env());
      expect(res.status).toBe(402);

      const body = await json(res);
      const accepts = body.accepts?.[0];
      expect(accepts).toBeDefined();
      expect(accepts.scheme).toBe("exact");
      // The mainnet wedge claim this template exists to prove: short name
      // "solana" (mainnet), never devnet or a bare CAIP-2 string here.
      expect(accepts.network).toBe("solana");
      expect(accepts.payTo).toBe(VALID_PAY_TO);
      // Solana settles need a gas sponsor advertised in the challenge.
      expect(accepts.extra?.feePayer).toBeTruthy();
      expect(BASE58.test(accepts.extra.feePayer)).toBe(true);
    },
  );

  it(
    "prices the challenge from the configured PRICE var, not a hardcoded amount",
    { timeout: 20_000 },
    async () => {
      const res = await app.request("/paid/hello", {}, env({ PRICE: "$0.10" }));
      expect(res.status).toBe(402);
      const body = await json(res);
      // $0.10 USDC at 6 decimals.
      expect(body.accepts?.[0]?.maxAmountRequired).toBe("100000");
    },
  );

  it(
    "does not serve the paid content without a payment header",
    { timeout: 20_000 },
    async () => {
      const res = await app.request("/paid/hello", {}, env());
      const body = await json(res);
      expect(body.ok).toBeUndefined();
      expect(body.content).toBeUndefined();
    },
  );
});
