import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_PAY_TO,
  isSolanaAddress,
  validatePayTo,
} from "../src/address.js";

describe("isSolanaAddress", () => {
  it("accepts base58 pubkeys of valid length", () => {
    expect(isSolanaAddress("4LkEFjJdXARkKx8FBx4LBFa2SvJNmjQpgGDLoJcypZUE")).toBe(
      true,
    );
    expect(isSolanaAddress("11111111111111111111111111111112")).toBe(true);
    expect(isSolanaAddress("GFpLvocNdEjnSsLH3VJQL6wGcjGxTbUBrj6fqN3Qe1Gs")).toBe(
      true,
    );
  });

  it("trims whitespace before checking", () => {
    expect(
      isSolanaAddress("  4LkEFjJdXARkKx8FBx4LBFa2SvJNmjQpgGDLoJcypZUE\n"),
    ).toBe(true);
  });

  it("rejects EVM, empty, and invalid alphabet", () => {
    expect(isSolanaAddress("0x" + "11".repeat(20))).toBe(false);
    expect(isSolanaAddress("")).toBe(false);
    expect(isSolanaAddress(undefined)).toBe(false);
    expect(isSolanaAddress(null)).toBe(false);
    expect(isSolanaAddress("not valid!!")).toBe(false);
    expect(isSolanaAddress("0OIl")).toBe(false);
  });
});

describe("validatePayTo", () => {
  it("refuses the shipped placeholder", () => {
    const v = validatePayTo(PLACEHOLDER_PAY_TO);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toBe("pay_to_not_configured");
  });

  it("refuses empty / whitespace", () => {
    expect(validatePayTo("").ok).toBe(false);
    expect(validatePayTo("   ").ok).toBe(false);
    expect(validatePayTo(undefined).ok).toBe(false);
  });

  it("refuses non-base58 shapes", () => {
    const v = validatePayTo("0xdeadbeef");
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.error).toBe("pay_to_not_base58");
      expect(v.received).toBe("0xdeadbeef");
    }
  });

  it("accepts a trimmed real-shaped wallet", () => {
    const v = validatePayTo("  11111111111111111111111111111112  ");
    expect(v).toEqual({ ok: true, payTo: "11111111111111111111111111111112" });
  });
});
