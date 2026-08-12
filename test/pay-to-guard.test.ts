import { describe, expect, it } from "vitest";
import {
  BASE58_SOLANA,
  checkPayTo,
  DEFAULTS,
  isMainnetSolanaShortName,
  PLACEHOLDER_PAY_TO,
} from "../src/payTo.js";
import { TEST_PAY_TO } from "./fakeEnv.js";

describe("checkPayTo", () => {
  it("accepts a base58 Solana-shaped address", () => {
    expect(checkPayTo(TEST_PAY_TO)).toBeNull();
    expect(checkPayTo("GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs")).toBeNull();
  });

  it("trims whitespace before validating", () => {
    expect(checkPayTo(`  ${TEST_PAY_TO}  `)).toBeNull();
  });

  it("refuses empty / missing PAY_TO", () => {
    for (const v of [undefined, null, "", "   "]) {
      const err = checkPayTo(v as string | undefined);
      expect(err).not.toBeNull();
      expect(err!.error).toBe("pay_to_not_configured");
      expect(err!.detail).toMatch(/placeholder|own Solana wallet/i);
      expect(err!.how).toMatch(/wrangler|Variables/i);
    }
  });

  it("refuses the shipped placeholder so one-click deploys cannot misroute money", () => {
    const err = checkPayTo(PLACEHOLDER_PAY_TO);
    expect(err).not.toBeNull();
    expect(err!.error).toBe("pay_to_not_configured");
  });

  it("refuses EVM 0x addresses (wrong chain for this wedge)", () => {
    const err = checkPayTo("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
    expect(err).not.toBeNull();
    expect(err!.error).toBe("pay_to_not_base58");
    expect(err!.received).toMatch(/^0x/);
  });

  it("refuses arbitrary non-base58 strings", () => {
    const err = checkPayTo("not-a-wallet");
    expect(err!.error).toBe("pay_to_not_base58");
  });

  it("refuses base58-looking strings outside the 32–44 length band", () => {
    expect(checkPayTo("1111111111111111")!.error).toBe("pay_to_not_base58"); // 16
    // 45 chars — too long
    expect(checkPayTo("1".repeat(45))!.error).toBe("pay_to_not_base58");
  });
});

describe("BASE58_SOLANA", () => {
  it("rejects alphabet characters that base58 forbids (0, O, I, l)", () => {
    // Insert a forbidden '0' into an otherwise length-valid string.
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
  });

  it("default price stays at or above the $0.01 sponsored-gas floor", () => {
    expect(DEFAULTS.PRICE).toBe("$0.05");
    const dollars = Number(DEFAULTS.PRICE.replace("$", ""));
    expect(dollars).toBeGreaterThanOrEqual(0.01);
  });
});
