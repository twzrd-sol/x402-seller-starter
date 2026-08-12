import { describe, expect, it } from "vitest";
import {
  BASE58,
  PLACEHOLDER_PAY_TO,
  isSolanaAddress,
  validatePayTo,
} from "../src/pay-to.js";

const VALID = "GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs";
const SYSTEM = "11111111111111111111111111111112";

describe("BASE58", () => {
  it("matches typical Solana pubkey lengths", () => {
    expect(BASE58.test(VALID)).toBe(true);
    expect(BASE58.test(SYSTEM)).toBe(true);
  });

  it("rejects EVM and garbage", () => {
    expect(BASE58.test("0x" + "11".repeat(20))).toBe(false);
    expect(BASE58.test("not valid!!")).toBe(false);
    expect(BASE58.test("")).toBe(false);
  });
});

describe("isSolanaAddress", () => {
  it("accepts valid base58", () => {
    expect(isSolanaAddress(VALID)).toBe(true);
    expect(isSolanaAddress(`  ${SYSTEM}\n`)).toBe(true);
  });

  it("rejects placeholder, empty, EVM", () => {
    expect(isSolanaAddress(PLACEHOLDER_PAY_TO)).toBe(false);
    expect(isSolanaAddress("")).toBe(false);
    expect(isSolanaAddress(undefined)).toBe(false);
    expect(isSolanaAddress("0xabc")).toBe(false);
  });
});

describe("validatePayTo", () => {
  it("returns trimmed payTo on success", () => {
    const r = validatePayTo(`  ${VALID}  `);
    expect(r).toEqual({ ok: true, payTo: VALID });
  });

  it("refuses empty and placeholder (misroute guard)", () => {
    for (const raw of ["", "   ", PLACEHOLDER_PAY_TO, undefined, null]) {
      const r = validatePayTo(raw as string);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.status).toBe(500);
        expect(r.body.error).toBe("pay_to_not_configured");
      }
    }
  });

  it("refuses non-base58", () => {
    const r = validatePayTo("0xnotsolana");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(500);
      expect(r.body.error).toBe("pay_to_not_base58");
      expect(r.body.received).toBe("0xnotsolana");
    }
  });
});
