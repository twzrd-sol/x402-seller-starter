import { describe, expect, it } from "vitest";
import {
  BASE58_SOLANA,
  DEFAULTS,
  isMainnetSolanaShortName,
  PLACEHOLDER_PAY_TO,
  resolveFacilitatorUrl,
  resolveNetwork,
  resolvePrice,
  validatePayTo,
} from "../src/payTo.js";
import { TEST_PAY_TO } from "./fakeEnv.js";

describe("validatePayTo", () => {
  it("accepts a base58 Solana-shaped address and returns it trimmed", () => {
    const v = validatePayTo(TEST_PAY_TO);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.payTo).toBe(TEST_PAY_TO);

    const live = validatePayTo("GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs");
    expect(live.ok).toBe(true);
    if (live.ok) expect(live.payTo).toBe("GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs");
  });

  it("returns the trimmed wallet so runtime can pass it to paymentMiddleware", () => {
    const padded = `  ${TEST_PAY_TO}  `;
    const v = validatePayTo(padded);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.payTo).toBe(TEST_PAY_TO);
      expect(v.payTo).not.toBe(padded);
      expect(v.payTo.startsWith(" ")).toBe(false);
      expect(v.payTo.endsWith(" ")).toBe(false);
    }
  });

  it("refuses empty / missing PAY_TO", () => {
    for (const raw of [undefined, null, "", "   "]) {
      const v = validatePayTo(raw as string | undefined);
      expect(v.ok).toBe(false);
      if (!v.ok) {
        expect(v.status).toBe(500);
        expect(v.body.error).toBe("pay_to_not_configured");
        expect(v.body.detail).toMatch(/placeholder|own Solana wallet/i);
        expect(v.body.how).toMatch(/wrangler|Variables/i);
      }
    }
  });

  it("refuses the shipped placeholder so one-click deploys cannot misroute money", () => {
    const v = validatePayTo(PLACEHOLDER_PAY_TO);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.body.error).toBe("pay_to_not_configured");
  });

  it("refuses EVM 0x addresses (wrong chain for this wedge)", () => {
    const v = validatePayTo("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.body.error).toBe("pay_to_not_base58");
      expect(v.body.received).toMatch(/^0x/);
    }
  });

  it("refuses arbitrary non-base58 strings", () => {
    const v = validatePayTo("not-a-wallet");
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.body.error).toBe("pay_to_not_base58");
  });

  it("refuses base58-looking strings outside the 32–44 length band", () => {
    expect(validatePayTo("1111111111111111").ok).toBe(false);
    expect(validatePayTo("1".repeat(45)).ok).toBe(false);
  });
});

describe("BASE58_SOLANA", () => {
  it("rejects alphabet characters that base58 forbids (0, O, I, l)", () => {
    expect(BASE58_SOLANA.test("11111111111111111111111111111110")).toBe(false);
    expect(BASE58_SOLANA.test("1111111111111111111111111111111O")).toBe(false);
    expect(BASE58_SOLANA.test("1111111111111111111111111111111I")).toBe(false);
    expect(BASE58_SOLANA.test("1111111111111111111111111111111l")).toBe(false);
  });
});

describe("network defaults (mainnet wedge claim)", () => {
  it("defaults NETWORK to short name solana (not CAIP-2, not devnet)", () => {
    expect(DEFAULTS.NETWORK).toBe("solana");
    expect(isMainnetSolanaShortName(DEFAULTS.NETWORK)).toBe(true);
    expect(resolveNetwork(undefined)).toBe("solana");
    expect(resolveNetwork("  solana  ")).toBe("solana");
  });

  it("rejects common non-mainnet aliases the smoke claim excludes", () => {
    for (const bad of [
      "solana-devnet",
      "solana:EtWTRAB…",
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "base-sepolia",
      "",
    ]) {
      expect(isMainnetSolanaShortName(bad)).toBe(false);
    }
  });

  it("default facilitator is TWZRD intel (gas-sponsored mainnet seam)", () => {
    expect(DEFAULTS.FACILITATOR_URL).toBe("https://intel.twzrd.xyz");
    expect(resolveFacilitatorUrl(null)).toBe(DEFAULTS.FACILITATOR_URL);
  });

  it("default price stays at or above the $0.01 sponsored-gas floor", () => {
    expect(DEFAULTS.PRICE).toBe("$0.05");
    expect(resolvePrice("")).toBe("$0.05");
    const dollars = Number(DEFAULTS.PRICE.replace("$", ""));
    expect(dollars).toBeGreaterThanOrEqual(0.01);
  });
});
